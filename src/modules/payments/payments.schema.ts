import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { payments } from "@/db/schema";
import { selectEscrowSchema } from "@/modules/escrows/escrows.schema";

export const selectPaymentSchema = createSelectSchema(payments, {
  paidAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
}).openapi("Payment");

// We need an escrow-with-payment response schema
export const paymentWithEscrowSchema = selectPaymentSchema
  .extend({
    escrow: selectEscrowSchema
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
