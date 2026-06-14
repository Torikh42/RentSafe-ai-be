import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { contracts, bookings, properties, users } from "../../db/schema";
import type { Env } from "../../env";
import { AIService } from "../../services/ai.service";
import { ulid } from "ulid";

export class ContractsService {
  constructor(private db: ReturnType<typeof getDb>) {}

  async generateContract(bookingId: string, env: Env) {
    // 1. Fetch booking
    const bookingList = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    const booking = bookingList[0];
    if (!booking) {
      throw new Error("Booking not found");
    }

    // 2. Fetch property
    const propertyList = await this.db
      .select()
      .from(properties)
      .where(eq(properties.id, booking.propertyId));
    const property = propertyList[0];
    if (!property) {
      throw new Error("Property associated with booking not found");
    }

    // 3. Fetch Tenant & Landlord
    const tenantList = await this.db
      .select()
      .from(users)
      .where(eq(users.id, booking.userId));
    const tenant = tenantList[0];
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const landlordList = await this.db
      .select()
      .from(users)
      .where(eq(users.id, property.landlordId));
    const landlord = landlordList[0];
    if (!landlord) {
      throw new Error("Landlord not found");
    }

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

    // 5. Look for existing contract for this booking
    const existingList = await this.db
      .select()
      .from(contracts)
      .where(eq(contracts.bookingId, bookingId));
    const existingContract = existingList[0];

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
      updatePayload.status = "active";
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
