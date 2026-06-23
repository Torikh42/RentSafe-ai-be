import type { AppEnv } from "@/factory";
import { getDb } from "@/db";
import { escrows, contracts, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createSnapTransaction } from "@/services/midtrans.service";
import { ulid } from "ulid";
import type { RouteHandler } from "@hono/zod-openapi";
import {
  getMyEscrowsRoute,
  initiatePaymentRoute,
  getEscrowByIdRoute,
} from "./escrows.routes";
import { getAuth } from "@/auth";

export const initiatePaymentHandler: RouteHandler<
  typeof initiatePaymentRoute,
  AppEnv
> = async (c) => {
  try {
    const { contractId } = c.req.valid("param");
    const auth = getAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const user = session?.user;
    const db = getDb(c.env);

    if (!user) return c.json({ message: "Unauthorized" }, 401 as const);

    // Get contract with tenant info using query builder (since relations aren't defined in schema)
    const result = await db
      .select({
        contract: contracts,
        tenant: users,
      })
      .from(contracts)
      .innerJoin(users, eq(contracts.tenantId, users.id))
      .where(eq(contracts.id, contractId))
      .limit(1);

    if (result.length === 0) {
      return c.json({ message: "Contract not found" }, 404 as const);
    }

    const { contract, tenant } = result[0];

    if (contract.tenantId !== user.id) {
      return c.json(
        { message: "Hanya tenant yang dapat melakukan pembayaran" },
        403 as const,
      );
    }

    if (contract.status !== "pending_payment") {
      return c.json(
        { message: "Kontrak belum siap untuk pembayaran" },
        400 as const,
      );
    }

    // Check if escrow already exists and is pending
    const existingEscrow = await db.query.escrows.findFirst({
      where: and(
        eq(escrows.contractId, contractId),
        eq(escrows.status, "pending"),
      ),
    });

    if (existingEscrow && existingEscrow.paymentUrl) {
      return c.json(
        {
          token: existingEscrow.snapToken || "",
          paymentUrl: existingEscrow.paymentUrl,
        },
        200 as const,
      );
    }

    // Generate new Midtrans transaction
    const grossAmount = contract.depositAmount + contract.monthlyRent;
    const orderId = `ESC-${ulid()}`;
    const fee = 0; // Admin fee

    const midtransRes = await createSnapTransaction(
      {
        serverKey: c.env.MIDTRANS_SERVER_KEY,
        isProduction: c.env.MIDTRANS_IS_PRODUCTION,
      },
      {
        orderId,
        grossAmount,
        customerDetails: {
          firstName: tenant.name || "Tenant",
          email: tenant.email,
        },
        itemDetails: [
          {
            id: "DEPOSIT",
            price: contract.depositAmount,
            quantity: 1,
            name: "Deposit Keamanan",
          },
          {
            id: "RENT_1",
            price: contract.monthlyRent,
            quantity: 1,
            name: "Sewa Bulan Pertama",
          },
        ],
      },
    );

    const escrowId = ulid();
    await db.insert(escrows).values({
      id: escrowId,
      contractId,
      amount: grossAmount,
      fee,
      status: "pending",
      midtransOrderId: orderId,
      paymentUrl: midtransRes.redirectUrl,
      snapToken: midtransRes.token,
    });

    return c.json(
      {
        token: midtransRes.token,
        paymentUrl: midtransRes.redirectUrl,
      },
      200 as const,
    );
  } catch (err) {
    console.error("[initiatePaymentHandler] ERROR:", err);
    return c.json({ message: "Internal Server Error" }, 500 as const);
  }
};

export const getMyEscrowsHandler: RouteHandler<
  typeof getMyEscrowsRoute,
  AppEnv
> = async (c) => {
  try {
    const auth = getAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const user = session?.user;
    const db = getDb(c.env);

    if (!user) return c.json({ message: "Unauthorized" }, 401 as const);

    // Find all contracts related to user (tenant or landlord)
    const myContracts = await db.query.contracts.findMany({
      where: (table, { or, eq }) =>
        or(eq(table.tenantId, user.id), eq(table.landlordId, user.id)),
      columns: {
        id: true,
      },
    });

    const contractIds = myContracts.map((c) => c.id);

    if (contractIds.length === 0) {
      return c.json([], 200 as const);
    }

    const myEscrows = await db.query.escrows.findMany({
      where: (table, { inArray }) => inArray(table.contractId, contractIds),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    const serialized = myEscrows.map((e) => ({
      ...e,
      createdAt:
        e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
      updatedAt:
        e.updatedAt instanceof Date ? e.updatedAt.toISOString() : e.updatedAt,
      releasedAt:
        e.releasedAt instanceof Date
          ? e.releasedAt.toISOString()
          : e.releasedAt,
    }));

    return c.json(serialized, 200 as const);
  } catch (err) {
    console.error("[getMyEscrowsHandler] ERROR:", err);
    return c.json({ message: "Internal Server Error" }, 500 as const);
  }
};

export const getEscrowByIdHandler: RouteHandler<
  typeof getEscrowByIdRoute,
  AppEnv
> = async (c) => {
  try {
    const auth = getAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const user = session?.user;
    const db = getDb(c.env);

    if (!user) return c.json({ message: "Unauthorized" }, 401 as const);

    const { escrowId } = c.req.valid("param");

    const [result] = await db
      .select({
        escrow: escrows,
        contract: contracts,
      })
      .from(escrows)
      .leftJoin(contracts, eq(escrows.contractId, contracts.id))
      .where(eq(escrows.id, escrowId));

    if (!result || !result.escrow || !result.contract) {
      return c.json({ message: "Not Found" }, 404 as const);
    }

    // Check if the user is authorized to view this escrow (must be tenant or landlord of the contract)
    if (
      result.contract.tenantId !== user.id &&
      result.contract.landlordId !== user.id &&
      user.role !== "admin"
    ) {
      return c.json({ message: "Forbidden" }, 403 as const);
    }

    const responseData = {
      ...result.escrow,
      contract: result.contract,
    };

    return c.json(responseData, 200 as const);
  } catch (err) {
    console.error("[getEscrowByIdHandler] ERROR:", err);
    return c.json({ message: "Internal Server Error" }, 500 as const);
  }
};
