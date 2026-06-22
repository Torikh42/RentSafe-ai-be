import { createRoute, z } from "@hono/zod-openapi";

export const midtransWebhookRoute = createRoute({
  method: "post",
  path: "/midtrans",
  summary: "Midtrans Payment Webhook Notification",
  description: "Handles Midtrans payment callback notifications",
  tags: ["Webhooks"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({}).passthrough(),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Notification received and processed",
      content: {
        "application/json": {
          schema: z.object({
            status: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    400: { description: "Bad Request / Verification Failed" },
    500: { description: "Internal Server Error" },
  },
});
