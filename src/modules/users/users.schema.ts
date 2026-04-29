import { z } from "@hono/zod-openapi";

export const updateRoleSchema = z.object({
  role: z.enum(["tenant", "landlord"]),
});

export const updateRoleResponseSchema = z.object({
  message: z.string(),
  role: z.string(),
});
