import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../factory";
import {
  createPropertyRoute,
  getMyPropertiesRoute,
  updatePropertyRoute,
  deletePropertyRoute,
} from "./properties.routes";
import {
  createPropertyHandler,
  getMyPropertiesHandler,
  updatePropertyHandler,
  deletePropertyHandler,
} from "./properties.handler";

const propertiesRouter = new OpenAPIHono<AppEnv>();

propertiesRouter.openapi(createPropertyRoute, createPropertyHandler);
propertiesRouter.openapi(getMyPropertiesRoute, getMyPropertiesHandler);
propertiesRouter.openapi(updatePropertyRoute, updatePropertyHandler);
propertiesRouter.openapi(deletePropertyRoute, deletePropertyHandler);

export default propertiesRouter;
