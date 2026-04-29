import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../factory";
import { getAuth } from "../../auth";
import { getDb } from "../../db";
import { PropertiesService } from "./properties.service";
import type {
  createPropertyRoute,
  getMyPropertiesRoute,
  updatePropertyRoute,
  deletePropertyRoute,
} from "./properties.routes";

export const createPropertyHandler: RouteHandler<
  typeof createPropertyRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  // Check role
  if (session.user.role !== "landlord") {
    return c.json({ message: "Forbidden" }, 403);
  }

  const data = c.req.valid("json");
  const db = getDb(c.env);
  const propertiesService = new PropertiesService(db);

  const property = await propertiesService.createProperty(
    session.user.id,
    data,
  );

  return c.json(
    { message: "Property created successfully", data: property },
    201,
  );
};

export const getMyPropertiesHandler: RouteHandler<
  typeof getMyPropertiesRoute,
  AppEnv
> = async (c) => {
  try {
    const auth = getAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session?.user) {
      return c.json({ message: "Unauthorized", data: [] }, 401);
    }

    if (session.user.role !== "landlord") {
      return c.json({ message: "Forbidden", data: [] }, 403);
    }

    const db = getDb(c.env);
    const propertiesService = new PropertiesService(db);

    const propertiesList = await propertiesService.getMyProperties(
      session.user.id,
    );

    // Serialize Date → ISO string to satisfy OpenAPI schema validation
    const serialized = propertiesList.map((p) => ({
      ...p,
      createdAt:
        p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      updatedAt:
        p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
    }));

    return c.json({ message: "Success", data: serialized }, 200);
  } catch (err) {
    console.error("[getMyPropertiesHandler] ERROR:", err);
    return c.json({ message: "Internal Server Error", data: [] }, 500);
  }
};

export const updatePropertyHandler: RouteHandler<
  typeof updatePropertyRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  if (session.user.role !== "landlord") {
    return c.json({ message: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");
  const data = c.req.valid("json");

  const db = getDb(c.env);
  const propertiesService = new PropertiesService(db);

  const property = await propertiesService.updateProperty(
    id,
    session.user.id,
    data,
  );

  if (!property) {
    return c.json({ message: "Property not found or unauthorized" }, 404);
  }

  return c.json(
    { message: "Property updated successfully", data: property },
    200,
  );
};

export const deletePropertyHandler: RouteHandler<
  typeof deletePropertyRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  if (session.user.role !== "landlord") {
    return c.json({ message: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");

  const db = getDb(c.env);
  const propertiesService = new PropertiesService(db);

  await propertiesService.deleteProperty(id, session.user.id);

  return c.json({ message: "Property deleted successfully" }, 200);
};
