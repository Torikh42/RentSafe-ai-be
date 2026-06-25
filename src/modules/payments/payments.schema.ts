import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { payments, escrows } from "@/db/schema";

export const selectPaymentSchema = createSelectSchema(payments, {
  paidAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
}).openapi("Payment");

// Define local version of escrow schema to avoid cross-module import
const localEscrowSchema = createSelectSchema(escrows, {
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  releasedAt: z.string().datetime().nullable(),
});

// We need an escrow-with-payment response schema
export const paymentWithEscrowSchema = selectPaymentSchema
  .extend({
    escrow: localEscrowSchema
      .extend({
        contract: z
          .object({
            propertyId: z.string(),
            tenantId: z.string(),
            landlordId: z.string(),
          })
          .optional(),
      })
      .optional(),
  })
  .openapi("PaymentWithEscrow");

export const getMyPaymentsResponseSchema = z
  .array(paymentWithEscrowSchema)
  .openapi("GetMyPaymentsResponse");
