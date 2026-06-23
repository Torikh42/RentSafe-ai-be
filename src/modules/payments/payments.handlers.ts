import { getDb } from "@/db";
import { contracts, escrows, payments } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { AppContext } from "@/factory";

export const getMyPaymentsHandler = async (c: AppContext) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  const db = getDb(c.env);

  const results = await db
    .select({
      payment: payments,
      escrow: escrows,
      contract: contracts,
    })
    .from(payments)
    .leftJoin(escrows, eq(payments.escrowId, escrows.id))
    .leftJoin(contracts, eq(escrows.contractId, contracts.id))
    .where(
      or(eq(contracts.tenantId, user.id), eq(contracts.landlordId, user.id)),
    )
    .orderBy(desc(payments.createdAt));

  // Transform data to match the schema
  const formattedResults = results.map((row) => ({
    ...row.payment,
    escrow: row.escrow
      ? {
          ...row.escrow,
          contract: row.contract
            ? {
                propertyId: row.contract.propertyId,
                tenantId: row.contract.tenantId,
                landlordId: row.contract.landlordId,
              }
            : undefined,
        }
      : undefined,
  }));

  return c.json(formattedResults, 200);
};
