import { createRoute, z } from "@hono/zod-openapi";
import {
  PaymentInitiationResponseSchema,
  contractIdParamSchema,
  selectEscrowSchema,
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
