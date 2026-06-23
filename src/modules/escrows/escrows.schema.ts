import { z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { escrows, payments } from "@/db/schema";

export const selectEscrowSchema = createSelectSchema(escrows);
export const insertEscrowSchema = createInsertSchema(escrows);

export const selectPaymentSchema = createSelectSchema(payments);
export const insertPaymentSchema = createInsertSchema(payments);

// Response schemas
export const PaymentInitiationResponseSchema = z
  .object({
    token: z.string().openapi({ description: "Midtrans Snap Token" }),
    paymentUrl: z.string().openapi({ description: "Midtrans Redirect URL" }),
  })
  .openapi("PaymentInitiationResponse");

export const EscrowDetailResponseSchema = selectEscrowSchema
  .extend({
    contract: z.object({
      propertyId: z.string(),
      tenantId: z.string(),
      landlordId: z.string(),
      depositAmount: z.number(),
      monthlyRent: z.number(),
      status: z.string(),
    }),
  })
  .openapi("EscrowDetailResponse");

// Request parameters
export const contractIdParamSchema = z.object({
  contractId: z.string().openapi({ description: "ID of the contract" }),
});

export const escrowIdParamSchema = z.object({
  escrowId: z.string().openapi({ description: "ID of the escrow" }),
});
