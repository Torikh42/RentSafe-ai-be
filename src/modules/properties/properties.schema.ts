import { z } from "@hono/zod-openapi";

// Base Schema
export const propertySchema = z.object({
  id: z.string().openapi({ example: "prop_123" }),
  name: z.string().min(1).openapi({ example: "Luxury Apartment" }),
  address: z.string().min(1).openapi({ example: "123 Main St, City" }),
  price: z.number().int().positive().openapi({ example: 5000000 }),
  description: z
    .string()
    .nullable()
    .optional()
    .openapi({ example: "A beautiful place." }),
  available: z.boolean().default(true).openapi({ example: true }),
  landlordId: z.string().openapi({ example: "usr_456" }),
  createdAt: z
    .union([z.string().datetime(), z.date()])
    .openapi({
      type: "string",
      format: "date-time",
      example: "2024-01-01T00:00:00Z",
    }),
  updatedAt: z
    .union([z.string().datetime(), z.date()])
    .openapi({
      type: "string",
      format: "date-time",
      example: "2024-01-01T00:00:00Z",
    }),
});

// Request Schemas
export const createPropertySchema = z.object({
  name: z.string().min(1).openapi({ example: "Luxury Apartment" }),
  address: z.string().min(1).openapi({ example: "123 Main St, City" }),
  price: z.number().int().positive().openapi({ example: 5000000 }),
  description: z.string().optional().openapi({ example: "A beautiful place." }),
  available: z.boolean().optional().default(true).openapi({ example: true }),
});

export const updatePropertySchema = createPropertySchema.partial();

// Response Schemas
export const propertyResponseSchema = z.object({
  message: z.string().openapi({ example: "Success" }),
  data: propertySchema,
});

export const propertiesListResponseSchema = z.object({
  message: z.string().openapi({ example: "Success" }),
  data: z.array(propertySchema),
});
