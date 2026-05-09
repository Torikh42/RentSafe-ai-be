import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../factory";
import type {
  listPropertiesRoute,
  getPropertyDetailRoute,
  searchPropertiesRoute,
} from "../routes/public.routes";
import { getDb } from "../../../db";
import { properties } from "../../../db/schema";
import { PropertiesService } from "../properties.service";
import type { InferSelectModel } from "drizzle-orm";

type Property = InferSelectModel<typeof properties>;

export const listPropertiesHandler: RouteHandler<
  typeof listPropertiesRoute,
  AppEnv
> = async (c) => {
  try {
    const query = c.req.valid("query");
    const db = getDb(c.env);
    const propertiesService = new PropertiesService(db);
    const result = await propertiesService.getProperties(
      query.page,
      query.limit,
    );

    // Serialize dates for JSON
    const serialized = result.data.map((p: Property) => ({
      ...p,
      createdAt:
        p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      updatedAt:
        p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
    }));

    return c.json(
      {
        message: "Success",
        data: serialized,
        pagination: result.pagination,
      },
      200 as const,
    );
  } catch (err) {
    console.error("[listPropertiesHandler] ERROR:", err);
    return c.json({ message: "Internal Server Error", data: [] }, 500 as const);
  }
};

export const getPropertyDetailHandler: RouteHandler<
  typeof getPropertyDetailRoute,
  AppEnv
> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const db = getDb(c.env);
    const propertiesService = new PropertiesService(db);
    const property = await propertiesService.getPropertyById(id);

    if (!property) {
      return c.json({ message: "Property not found" }, 404 as const);
    }

    // Serialize dates
    const serialized = {
      ...property,
      createdAt:
        property.createdAt instanceof Date
          ? property.createdAt.toISOString()
          : property.createdAt,
      updatedAt:
        property.updatedAt instanceof Date
          ? property.updatedAt.toISOString()
          : property.updatedAt,
    };

    return c.json(
      {
        message: "Success",
        data: serialized,
      },
      200 as const,
    );
  } catch (err) {
    console.error("[getPropertyDetailHandler] ERROR:", err);
    return c.json({ message: "Internal Server Error", data: [] }, 500 as const);
  }
};

export const searchPropertiesHandler: RouteHandler<
  typeof searchPropertiesRoute,
  AppEnv
> = async (c) => {
  try {
    const query = c.req.valid("query");
    const db = getDb(c.env);
    const propertiesService = new PropertiesService(db);
    const result = await propertiesService.searchProperties(
      query.q || "",
      {
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        available: query.available,
      },
      query.page,
      query.limit,
    );

    const serialized = result.data.map((p: Property) => ({
      ...p,
      createdAt:
        p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      updatedAt:
        p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
    }));

    return c.json(
      {
        message: "Success",
        data: serialized,
        pagination: result.pagination,
      },
      200 as const,
    );
  } catch (err) {
    console.error("[searchPropertiesHandler] ERROR:", err);
    return c.json({ message: "Internal Server Error", data: [] }, 500 as const);
  }
};
