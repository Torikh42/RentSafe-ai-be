import { z } from "@hono/zod-openapi";

export const errorResponseSchema = z.object({
  message: z.string().openapi({
    example: "An error occurred",
  }),
  data: z.array(z.unknown()).optional().openapi({
    example: [],
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
