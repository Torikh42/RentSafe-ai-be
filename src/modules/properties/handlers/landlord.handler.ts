import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../factory";
import type {
  createPropertyRoute,
  getMyPropertiesRoute,
  updatePropertyRoute,
  deletePropertyRoute,
} from "../routes/landlord.routes";
import { PropertiesService } from "../properties.service";
import { getAuth } from "../../../auth";
import { getDb } from "../../../db";
import { properties } from "../../../db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { CloudinaryService } from "../../../services/cloudinary.service";

type Property = InferSelectModel<typeof properties>;

export const createPropertyHandler: RouteHandler<
  typeof createPropertyRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401 as const);
  }

  // Check role
  if (session.user.role !== "landlord") {
    return c.json({ message: "Forbidden" }, 403 as const);
  }

  const data = c.req.valid("form");
  const db = getDb(c.env);

  let imageUrl: string | undefined;
  if (data.image && data.image instanceof File) {
    const cloudinary = new CloudinaryService(
      c.env.CLOUDINARY_CLOUD_NAME,
      c.env.CLOUDINARY_API_KEY,
      c.env.CLOUDINARY_API_SECRET,
    );
    const arrayBuffer = await data.image.arrayBuffer();

    imageUrl = await cloudinary.upload(arrayBuffer, "properties");
  }

  const { image: _image, ...propertyData } = data;
  const propertiesService = new PropertiesService(db);
  const property = await propertiesService.createProperty(session.user.id, {
    ...propertyData,
    image: imageUrl || undefined,
  });

  return c.json(
    { message: "Property created successfully", data: property },
    201 as const,
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
      return c.json({ message: "Unauthorized", data: [] }, 401 as const);
    }

    if (session.user.role !== "landlord") {
      return c.json({ message: "Forbidden", data: [] }, 403 as const);
    }

    const db = getDb(c.env);
    const properties = await db.query.properties.findMany({
      where: (p, { eq }) => eq(p.landlordId, session.user.id),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });

    const serialized = properties.map((p: Property) => ({
      ...p,
      createdAt:
        p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      updatedAt:
        p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
    }));

    return c.json({ message: "Success", data: serialized }, 200 as const);
  } catch (err) {
    console.error("[getMyPropertiesHandler] ERROR:", err);
    return c.json({ message: "Internal Server Error", data: [] }, 500 as const);
  }
};

export const updatePropertyHandler: RouteHandler<
  typeof updatePropertyRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401 as const);
  }

  if (session.user.role !== "landlord") {
    return c.json({ message: "Forbidden" }, 403 as const);
  }

  const { id } = c.req.valid("param");
  const data = c.req.valid("form");
  const db = getDb(c.env);

  let imageUrl: string | undefined;
  if (data.image && data.image instanceof File) {
    const cloudinary = new CloudinaryService(
      c.env.CLOUDINARY_CLOUD_NAME,
      c.env.CLOUDINARY_API_KEY,
      c.env.CLOUDINARY_API_SECRET,
    );
    const arrayBuffer = await data.image.arrayBuffer();

    imageUrl = await cloudinary.upload(arrayBuffer, "properties");
  }

  const { image: _image, ...propertyData } = data;
  const updatePayload = imageUrl
    ? { ...propertyData, image: imageUrl }
    : propertyData;

  const propertiesService = new PropertiesService(db);

  const property = await propertiesService.updateProperty(
    id,
    session.user.id,
    updatePayload,
  );

  if (!property) {
    return c.json(
      { message: "Property not found or unauthorized" },
      404 as const,
    );
  }

  return c.json(
    { message: "Property updated successfully", data: property },
    200 as const,
  );
};

export const deletePropertyHandler: RouteHandler<
  typeof deletePropertyRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401 as const);
  }

  if (session.user.role !== "landlord") {
    return c.json({ message: "Forbidden" }, 403 as const);
  }

  const { id } = c.req.valid("param");
  const db = getDb(c.env);
  const propertiesService = new PropertiesService(db);

  await propertiesService.deleteProperty(id, session.user.id);

  return c.json({ message: "Property deleted successfully" }, 200 as const);
};
