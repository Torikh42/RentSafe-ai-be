import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../factory";
import { getAuth } from "../../auth";
import {
  createBooking,
  getMyBookings,
  updateBookingStatus,
} from "./bookings.service";
import {
  acceptBookingRoute,
  cancelBookingRoute,
  createBookingRoute,
  getMyBookingsRoute,
  rejectBookingRoute,
} from "./bookings.routes";

const formatBookingDates = <
  T extends {
    startDate: string | Date;
    endDate: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
  },
>(
  booking: T,
) => ({
  ...booking,
  startDate:
    booking.startDate instanceof Date
      ? booking.startDate.toISOString()
      : (booking.startDate as string),
  endDate:
    booking.endDate instanceof Date
      ? booking.endDate.toISOString()
      : (booking.endDate as string),
  createdAt:
    booking.createdAt instanceof Date
      ? booking.createdAt.toISOString()
      : (booking.createdAt as string),
  updatedAt:
    booking.updatedAt instanceof Date
      ? booking.updatedAt.toISOString()
      : (booking.updatedAt as string),
});

export const createBookingHandler: RouteHandler<
  typeof createBookingRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const { propertyId, startDate, endDate } = c.req.valid("json");
    const booking = await createBooking(
      c.env,
      session.user.id,
      propertyId,
      startDate,
      endDate,
    );

    return c.json(
      { message: "Booking created", data: formatBookingDates(booking) },
      201,
    );
  } catch (error) {
    return c.json(
      { message: error instanceof Error ? error.message : "Bad Request" },
      400,
    );
  }
};

export const getMyBookingsHandler: RouteHandler<
  typeof getMyBookingsRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  // @ts-ignore - session.user.role is added in auth config
  const role = (session.user.role as string) || "tenant";

  try {
    const bookings = await getMyBookings(c.env, session.user.id, role);
    const formattedBookings = bookings.map(formatBookingDates);
    return c.json(
      { message: "List of user bookings", data: formattedBookings },
      200,
    );
  } catch (error) {
    console.error("Get my bookings error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};

export const acceptBookingHandler: RouteHandler<
  typeof acceptBookingRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  // @ts-ignore
  const role = (session.user.role as string) || "tenant";
  const { id } = c.req.valid("param");

  try {
    const booking = await updateBookingStatus(
      c.env,
      session.user.id,
      role,
      id,
      "accept",
    );
    return c.json(
      { message: "Booking accepted", data: formatBookingDates(booking) },
      200,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg.includes("Unauthorized") || msg.includes("Only landlords")) {
      return c.json({ message: msg }, 403);
    }
    if (msg.includes("not found")) {
      return c.json({ message: msg }, 404);
    }
    return c.json({ message: msg }, 400);
  }
};

export const rejectBookingHandler: RouteHandler<
  typeof rejectBookingRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  // @ts-ignore
  const role = (session.user.role as string) || "tenant";
  const { id } = c.req.valid("param");

  try {
    const booking = await updateBookingStatus(
      c.env,
      session.user.id,
      role,
      id,
      "reject",
    );
    return c.json(
      { message: "Booking rejected", data: formatBookingDates(booking) },
      200,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg.includes("Unauthorized") || msg.includes("Only landlords")) {
      return c.json({ message: msg }, 403);
    }
    if (msg.includes("not found")) {
      return c.json({ message: msg }, 404);
    }
    return c.json({ message: msg }, 400);
  }
};

export const cancelBookingHandler: RouteHandler<
  typeof cancelBookingRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  // @ts-ignore
  const role = (session.user.role as string) || "tenant";
  const { id } = c.req.valid("param");

  try {
    const booking = await updateBookingStatus(
      c.env,
      session.user.id,
      role,
      id,
      "cancel",
    );
    return c.json(
      { message: "Booking cancelled", data: formatBookingDates(booking) },
      200,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg.includes("Unauthorized")) {
      return c.json({ message: msg }, 403);
    }
    if (msg.includes("not found")) {
      return c.json({ message: msg }, 404);
    }
    return c.json({ message: msg }, 400);
  }
};
