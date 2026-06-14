import { z } from "@hono/zod-openapi";

export const bookingSchema = z.object({
  id: z.string().openapi({ example: "book_123" }),
  propertyId: z.string().openapi({ example: "prop_123" }),
  userId: z.string().openapi({ example: "usr_456" }),
  startDate: z.union([z.string().datetime(), z.date()]),
  endDate: z.union([z.string().datetime(), z.date()]),
  status: z
    .enum(["pending", "approved", "rejected", "cancelled", "completed"])
    .openapi({ example: "pending" }),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
});

export const createBookingSchema = z.object({
  propertyId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const bookingResponseSchema = z.object({
  message: z.string(),
  data: bookingSchema,
});

export const bookingsListResponseSchema = z.object({
  message: z.string(),
  data: z.array(bookingSchema),
});
