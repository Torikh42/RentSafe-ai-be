import { createRouter } from "../../factory";
import { updateRoleRoute } from "./users.routes";
import { updateRoleHandler } from "./users.handler";

export const usersRouter = createRouter();

usersRouter.openapi(updateRoleRoute, updateRoleHandler);
