import { createRoute } from "@hono/zod-openapi";
import { getMyPaymentsResponseSchema } from "./payments.schema";

const tags = ["Payments"];

export const getMyPaymentsRoute = createRoute({
  method: "get",
  path: "/my",
  tags,
  summary: "Get my payments",
  description:
    "Get a list of payments associated with the authenticated user (as tenant or landlord)",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: "List of payments",
      content: {
        "application/json": {
          schema: getMyPaymentsResponseSchema,
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
});
