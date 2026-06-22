import { eq, aliasedTable } from "drizzle-orm";
import { getDb } from "../../db";
import { contracts, bookings, properties, users } from "../../db/schema";
import type { Env } from "../../env";
import { AIService } from "../../services/ai.service";
import { ulid } from "ulid";

export class ContractsService {
  constructor(private db: ReturnType<typeof getDb>) {}

  async generateContract(bookingId: string, env: Env) {
    const tenantUsers = aliasedTable(users, "tenant_users");
    const landlordUsers = aliasedTable(users, "landlord_users");

    const dataList = await this.db
      .select({
        booking: bookings,
        property: properties,
        tenant: tenantUsers,
        landlord: landlordUsers,
        contract: contracts,
      })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .innerJoin(tenantUsers, eq(bookings.userId, tenantUsers.id))
      .innerJoin(landlordUsers, eq(properties.landlordId, landlordUsers.id))
      .leftJoin(contracts, eq(contracts.bookingId, bookings.id))
      .where(eq(bookings.id, bookingId));

    const data = dataList[0];
    if (!data) {
      throw new Error("Booking or related entities not found");
    }

    const { booking, property, tenant, landlord } = data;

    // 4. Instantiate AIService and generate contract text + analyze fairness
    const aiService = new AIService(env.GOOGLE_GENERATIVE_AI_API_KEY);
    const terms = {
      monthlyRent: property.price,
      depositAmount: property.price, // Default deposit is 1 month rent
      startDate: booking.startDate,
      endDate: booking.endDate,
    };

    const contractText = await aiService.generateContract(
      property,
      tenant,
      landlord,
      terms,
    );
    const fairness = await aiService.analyzeFairness(contractText);

    const existingContract = data.contract;

    if (existingContract) {
      const [updated] = await this.db
        .update(contracts)
        .set({
          contractText,
          fairnessScore: fairness.score,
          status: "pending_signature",
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, existingContract.id))
        .returning();
      return updated;
    } else {
      const contractId = `contract_${ulid()}`;
      const [inserted] = await this.db
        .insert(contracts)
        .values({
          id: contractId,
          propertyId: booking.propertyId,
          tenantId: booking.userId,
          landlordId: property.landlordId,
          bookingId: booking.id,
          startDate: booking.startDate,
          endDate: booking.endDate,
          depositAmount: property.price,
          monthlyRent: property.price,
          contractText,
          fairnessScore: fairness.score,
          status: "pending_signature",
        })
        .returning();
      return inserted;
    }
  }

  async getMyContracts(userId: string, role: string) {
    if (role === "landlord") {
      const landlordContracts = await this.db
        .select({
          contract: contracts,
          property: properties,
          tenant: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(contracts)
        .innerJoin(properties, eq(contracts.propertyId, properties.id))
        .innerJoin(users, eq(contracts.tenantId, users.id))
        .where(eq(properties.landlordId, userId));

      return landlordContracts.map(({ contract, property, tenant }) => ({
        ...contract,
        property,
        tenant,
      }));
    }

    const tenantContracts = await this.db
      .select({
        contract: contracts,
        property: properties,
        landlord: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(contracts)
      .innerJoin(properties, eq(contracts.propertyId, properties.id))
      .innerJoin(users, eq(contracts.landlordId, users.id))
      .where(eq(contracts.tenantId, userId));

    return tenantContracts.map(({ contract, property, landlord }) => ({
      ...contract,
      property,
      landlord,
    }));
  }

  async getContractById(id: string) {
    const contractList = await this.db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id));
    return contractList[0] || null;
  }

  async signContract(id: string, userId: string, role: string) {
    const contractList = await this.db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id));
    const contract = contractList[0];

    if (!contract) {
      throw new Error("Contract not found");
    }

    let updatePayload: Partial<typeof contracts.$inferInsert> = {};

    if (role === "tenant" && contract.tenantId === userId) {
      updatePayload.signedByTenant = true;
    } else if (role === "landlord" && contract.landlordId === userId) {
      updatePayload.signedByLandlord = true;
    } else {
      throw new Error("Unauthorized to sign this contract");
    }

    const isSignedByTenant =
      updatePayload.signedByTenant || contract.signedByTenant;
    const isSignedByLandlord =
      updatePayload.signedByLandlord || contract.signedByLandlord;

    if (isSignedByTenant && isSignedByLandlord) {
      // Contract is fully signed but waits for payment to become active
      updatePayload.status = "pending_payment";
      updatePayload.signedAt = new Date();
      updatePayload.expiresAt = contract.endDate;
    }

    updatePayload.updatedAt = new Date();

    const [updated] = await this.db
      .update(contracts)
      .set(updatePayload)
      .where(eq(contracts.id, id))
      .returning();

    return updated;
  }
}
