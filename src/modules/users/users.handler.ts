import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../factory";
import { getAuth } from "../../auth";
import { getDb } from "../../db";
import { UsersService } from "./users.service";
import type { updateRoleRoute } from "./users.routes";

export const updateRoleHandler: RouteHandler<
  typeof updateRoleRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const { role } = c.req.valid("json");
  const db = getDb(c.env);
  const usersService = new UsersService(db);

  await usersService.updateRole(session.user.id, role);

  return c.json({ message: "Role updated successfully", role }, 200);
};
