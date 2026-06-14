import { z } from "@hono/zod-openapi";

export const contractSchema = z.object({
  id: z.string().openapi({ example: "contract_123" }),
  propertyId: z.string().openapi({ example: "prop_123" }),
  tenantId: z.string().openapi({ example: "usr_tenant" }),
  landlordId: z.string().openapi({ example: "usr_landlord" }),
  bookingId: z.string().openapi({ example: "book_123" }),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  depositAmount: z.number().int().openapi({ example: 5000000 }),
  monthlyRent: z.number().int().openapi({ example: 5000000 }),
  contractText: z.string().nullable().optional(),
  fairnessScore: z.number().int().nullable().optional(),
  status: z
    .enum(["draft", "pending_signature", "active", "expired", "terminated"])
    .openapi({ example: "draft" }),
  signedByTenant: z.boolean().openapi({ example: false }),
  signedByLandlord: z.boolean().openapi({ example: false }),
  signedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const generateContractBodySchema = z.object({
  bookingId: z.string().min(1),
});

export const contractResponseSchema = z.object({
  message: z.string(),
  data: contractSchema,
});

export const fairnessResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    score: z.number(),
    summary: z.string(),
  }),
});
