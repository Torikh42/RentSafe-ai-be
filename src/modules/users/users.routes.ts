import { createRoute } from "@hono/zod-openapi";
import { updateRoleSchema, updateRoleResponseSchema } from "./users.schema";

export const updateRoleRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Users"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: updateRoleSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "User role updated successfully",
      content: {
        "application/json": {
          schema: updateRoleResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
    },
  },
});
