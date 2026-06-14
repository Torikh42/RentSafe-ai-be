import { createRoute, z } from "@hono/zod-openapi";
import {
  bookingResponseSchema,
  bookingsListResponseSchema,
  createBookingSchema,
} from "./bookings.schema";
import { errorResponseSchema } from "../../lib/common-schemas";

const paramIdSchema = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

export const createBookingRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Bookings"],
  request: {
    body: {
      content: { "application/json": { schema: createBookingSchema } },
    },
  },
  responses: {
    201: {
      description: "Booking created",
      content: { "application/json": { schema: bookingResponseSchema } },
    },
    400: {
      description: "Bad Request",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

export const getMyBookingsRoute = createRoute({
  method: "get",
  path: "/my",
  tags: ["Bookings"],
  responses: {
    200: {
      description: "List of user bookings",
      content: { "application/json": { schema: bookingsListResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    500: {
      description: "Internal Server Error",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

export const acceptBookingRoute = createRoute({
  method: "post",
  path: "/{id}/accept",
  tags: ["Bookings"],
  request: { params: paramIdSchema },
  responses: {
    200: {
      description: "Booking accepted",
      content: { "application/json": { schema: bookingResponseSchema } },
    },
    400: {
      description: "Bad Request",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    404: {
      description: "Not Found",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

export const rejectBookingRoute = createRoute({
  method: "post",
  path: "/{id}/reject",
  tags: ["Bookings"],
  request: { params: paramIdSchema },
  responses: {
    200: {
      description: "Booking rejected",
      content: { "application/json": { schema: bookingResponseSchema } },
    },
    400: {
      description: "Bad Request",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    404: {
      description: "Not Found",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

export const cancelBookingRoute = createRoute({
  method: "post",
  path: "/{id}/cancel",
  tags: ["Bookings"],
  request: { params: paramIdSchema },
  responses: {
    200: {
      description: "Booking cancelled",
      content: { "application/json": { schema: bookingResponseSchema } },
    },
    400: {
      description: "Bad Request",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    404: {
      description: "Not Found",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
