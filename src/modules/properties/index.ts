import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../factory";

// Routes
import {
  listPropertiesRoute,
  getPropertyDetailRoute,
  searchPropertiesRoute,
} from "./routes/public.routes";
import {
  createPropertyRoute,
  getMyPropertiesRoute,
  updatePropertyRoute,
  deletePropertyRoute,
} from "./routes/landlord.routes";

// Handlers
import {
  listPropertiesHandler,
  getPropertyDetailHandler,
  searchPropertiesHandler,
} from "./handlers/public.handler";
import {
  createPropertyHandler,
  getMyPropertiesHandler,
  updatePropertyHandler,
  deletePropertyHandler,
} from "./handlers/landlord.handler";

const propertiesRouter = new OpenAPIHono<AppEnv>();

// ============= PUBLIC ROUTES (No Auth) =============
propertiesRouter.openapi(listPropertiesRoute, listPropertiesHandler);
propertiesRouter.openapi(searchPropertiesRoute, searchPropertiesHandler);

// ============= PROTECTED ROUTES (Auth Required) =============
propertiesRouter.openapi(createPropertyRoute, createPropertyHandler);
propertiesRouter.openapi(getMyPropertiesRoute, getMyPropertiesHandler);
propertiesRouter.openapi(updatePropertyRoute, updatePropertyHandler);
propertiesRouter.openapi(deletePropertyRoute, deletePropertyHandler);
propertiesRouter.openapi(getPropertyDetailRoute, getPropertyDetailHandler);

export default propertiesRouter;
