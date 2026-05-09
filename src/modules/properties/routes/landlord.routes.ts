import { createRoute, z } from "@hono/zod-openapi";
import {
  createPropertySchema,
  updatePropertySchema,
  propertyResponseSchema,
  propertiesListResponseSchema,
  errorResponseSchema,
} from "../properties.schema";

export const createPropertyRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Properties"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createPropertySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Property created successfully",
      content: {
        "application/json": {
          schema: propertyResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden (Not a landlord)",
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

export const getMyPropertiesRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Properties"],
  responses: {
    200: {
      description: "Get current landlord's properties",
      content: {
        "application/json": {
          schema: propertiesListResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
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

export const updatePropertyRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Properties"],
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: "id", in: "path" } }),
    }),
    body: {
      content: {
        "application/json": {
          schema: updatePropertySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Property updated successfully",
      content: {
        "application/json": {
          schema: propertyResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: errorResponseSchema,
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

export const deletePropertyRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Properties"],
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: "id", in: "path" } }),
    }),
  },
  responses: {
    200: {
      description: "Property deleted successfully",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: errorResponseSchema,
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
