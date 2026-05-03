import { createRoute, z } from "@hono/zod-openapi";
import { InspectionResponseSchema } from "./inspections.schema";

const ErrorResponseSchema = z.object({
  error: z.string(),
});

export const analyzeInspectionRoute = createRoute({
  method: "post",
  path: "/analyze",
  tags: ["Inspections"],
  summary: "Upload photos and analyze property condition via AI",
  description:
    "Uploads images to R2 and generates an AI inspection report using Gemini.",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            propertyId: z.string(),
            type: z.enum(["pre", "post"]),
            images: z
              .custom<File | File[]>(
                (v) =>
                  v instanceof File ||
                  (Array.isArray(v) && v.every((i) => i instanceof File)),
              )
              .openapi({
                type: "array",
                items: { type: "string", format: "binary" },
              }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: InspectionResponseSchema,
        },
      },
      description: "Inspection created successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid input",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Unauthorized - must be landlord",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal Server Error",
    },
  },
});

export const getPropertyInspectionsRoute = createRoute({
  method: "get",
  path: "/property/{propertyId}",
  tags: ["Inspections"],
  summary: "Get all inspections for a property",
  request: {
    params: z.object({
      propertyId: z
        .string()
        .openapi({ param: { name: "propertyId", in: "path" } }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(InspectionResponseSchema),
        },
      },
      description: "List of inspections",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Not Found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal Server Error",
    },
  },
});

export const compareInspectionsRoute = createRoute({
  method: "post",
  path: "/{id}/compare",
  tags: ["Inspections"],
  summary: "Compare a check-out inspection with its baseline check-in",
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: "id", in: "path" } }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: InspectionResponseSchema,
        },
      },
      description: "Comparison completed successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Bad Request",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Unauthorized",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Not Found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal Server Error",
    },
  },
});
