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
  image: z
    .string()
    .nullable()
    .optional()
    .openapi({ example: "https://example.com/image.jpg" }),
  available: z.boolean().default(true).openapi({ example: true }),
  landlordId: z.string().openapi({ example: "usr_456" }),
  createdAt: z.union([z.string().datetime(), z.date()]).openapi({
    type: "string",
    format: "date-time",
    example: "2024-01-01T00:00:00Z",
  }),
  updatedAt: z.union([z.string().datetime(), z.date()]).openapi({
    type: "string",
    format: "date-time",
    example: "2024-01-01T00:00:00Z",
  }),
});

// Landlord info schema for public view
export const landlordSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable().optional(),
});

// Property with landlord info
export const propertyDetailSchema = propertySchema.extend({
  landlord: landlordSchema.nullable().optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().positive().openapi({ example: 1 }),
  limit: z.number().int().positive().openapi({ example: 12 }),
  total: z.number().int().openapi({ example: 50 }),
  totalPages: z.number().int().openapi({ example: 5 }),
  hasNext: z.boolean().openapi({ example: true }),
  hasPrev: z.boolean().openapi({ example: false }),
});

// Request Schemas
export const createPropertySchema = z.object({
  name: z.string().min(1).openapi({ example: "Luxury Apartment" }),
  address: z.string().min(1).openapi({ example: "123 Main St, City" }),
  price: z.number().int().positive().openapi({ example: 5000000 }),
  description: z.string().optional().openapi({ example: "A beautiful place." }),
  available: z.boolean().optional().default(true).openapi({ example: true }),
  image: z
    .string()
    .optional()
    .nullable()
    .openapi({ example: "https://example.com/image.jpg" }),
});

export const updatePropertySchema = createPropertySchema.partial();

// Query schemas for public endpoints
export const listPropertiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(12),
});

export const searchPropertiesQuerySchema = z.object({
  q: z.string().optional().openapi({ example: "apartment" }),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  available: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(12),
});

// Response Schemas
export const propertyResponseSchema = z.object({
  message: z.string().openapi({ example: "Success" }),
  data: propertySchema,
});

export const propertiesListResponseSchema = z.object({
  message: z.string().openapi({ example: "Success" }),
  data: z.array(propertySchema),
});

export const propertiesPublicListResponseSchema = z.object({
  message: z.string().openapi({ example: "Success" }),
  data: z.array(propertyDetailSchema),
  pagination: paginationSchema,
});

export const propertyDetailResponseSchema = z.object({
  message: z.string().openapi({ example: "Success" }),
  data: propertyDetailSchema,
});

export const errorResponseSchema = z.object({
  message: z.string(),
  data: z.array(z.unknown()).optional(),
});
