import { createRoute, z } from "@hono/zod-openapi";
import {
  listPropertiesQuerySchema,
  propertiesPublicListResponseSchema,
  propertyDetailResponseSchema,
  searchPropertiesQuerySchema,
  errorResponseSchema,
} from "../properties.schema";

export const listPropertiesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Properties"],
  summary: "List all available properties",
  description: "Public endpoint to list all properties with pagination",
  request: {
    query: listPropertiesQuerySchema,
  },
  responses: {
    200: {
      description: "List of properties retrieved successfully",
      content: {
        "application/json": {
          schema: propertiesPublicListResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

export const getPropertyDetailRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Properties"],
  summary: "Get property details",
  description:
    "Get detailed information about a specific property including landlord info",
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: "id", in: "path" } }),
    }),
  },
  responses: {
    200: {
      description: "Property details retrieved successfully",
      content: {
        "application/json": {
          schema: propertyDetailResponseSchema,
        },
      },
    },
    404: {
      description: "Property not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

export const searchPropertiesRoute = createRoute({
  method: "get",
  path: "/search",
  tags: ["Properties"],
  summary: "Search properties with filters",
  description:
    "Search properties by name/address with optional price and availability filters",
  request: {
    query: searchPropertiesQuerySchema,
  },
  responses: {
    200: {
      description: "Search results retrieved successfully",
      content: {
        "application/json": {
          schema: propertiesPublicListResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});
