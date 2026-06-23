import { createRoute, z } from "@hono/zod-openapi";
import {
  PaymentInitiationResponseSchema,
  contractIdParamSchema,
  selectEscrowSchema,
  EscrowDetailResponseSchema,
} from "./escrows.schema";

export const initiatePaymentRoute = createRoute({
  method: "post",
  path: "/{contractId}/pay",
  summary: "Initiate payment for a contract",
  description: "Creates an escrow and generates a Midtrans Snap Token",
  tags: ["Escrows"],
  request: {
    params: contractIdParamSchema,
  },
  responses: {
    200: {
      description: "Payment initiated",
      content: {
        "application/json": {
          schema: PaymentInitiationResponseSchema,
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Not Found" },
    500: { description: "Internal Server Error" },
  },
});

export const getMyEscrowsRoute = createRoute({
  method: "get",
  path: "/my",
  summary: "Get my escrows",
  description: "Get all escrows related to the authenticated user",
  tags: ["Escrows"],
  responses: {
    200: {
      description: "List of escrows",
      content: {
        "application/json": {
          schema: z.array(selectEscrowSchema),
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
});

export const getEscrowByIdRoute = createRoute({
  method: "get",
  path: "/{escrowId}",
  summary: "Get escrow detail",
  description:
    "Get detailed information about a specific escrow, including contract details.",
  tags: ["Escrows"],
  request: {
    params: z.object({
      escrowId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Escrow details",
      content: {
        "application/json": {
          schema: EscrowDetailResponseSchema,
        },
      },
    },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Not Found" },
    500: { description: "Internal Server Error" },
  },
});
