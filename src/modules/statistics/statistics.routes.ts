import { createRoute, z } from "@hono/zod-openapi";
import { errorResponseSchema } from "../../lib/common-schemas";

export const getStatisticsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Statistics"],
  responses: {
    200: {
      description: "Get real-time portfolio and rental statistics",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            data: z.record(z.string(), z.unknown()),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    500: {
      description: "Internal Server Error",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
