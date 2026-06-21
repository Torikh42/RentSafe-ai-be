import { eq, inArray, and, lte, gte } from "drizzle-orm";
import { getDb } from "../../db";
import { bookings, properties, contracts, users } from "../../db/schema";
import type { Env } from "../../env";
import { ulid } from "ulid";

export const createBooking = async (
  env: Env,
  userId: string,
  propertyId: string,
  startDate: string,
  endDate: string,
) => {
  const db = getDb(env);

  const propertyList = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId));

  const property = propertyList[0];

  if (!property) {
    throw new Error("Property not found");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check both overlaps in parallel
  const [tenantOverlap, propertyOverlap] = await Promise.all([
    db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          inArray(bookings.status, ["pending", "approved"]),
          lte(bookings.startDate, end),
          gte(bookings.endDate, start),
        ),
      ),
    db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, propertyId),
          eq(bookings.status, "approved"),
          lte(bookings.startDate, end),
          gte(bookings.endDate, start),
        ),
      ),
  ]);

  if (tenantOverlap.length > 0) {
    throw new Error(
      "Anda sudah memiliki pengajuan sewa aktif (pending/approved) yang bertabrakan dengan jadwal periode sewa ini.",
    );
  }

  if (propertyOverlap.length > 0) {
    throw new Error(
      "Properti ini sudah disewa oleh orang lain pada rentang tanggal tersebut.",
    );
  }

  const id = `book_${ulid()}`;
  const [newBooking] = await db
    .insert(bookings)
    .values({
      id,
      propertyId,
      userId,
      startDate: start,
      endDate: end,
      status: "pending",
    })
    .returning();

  return newBooking;
};

export const getMyBookings = async (env: Env, userId: string, role: string) => {
  const db = getDb(env);

  if (role === "landlord") {
    const landlordBookings = await db
      .select({
        booking: bookings,
        property: properties,
        tenant: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(eq(properties.landlordId, userId));

    return landlordBookings.map(({ booking, property, tenant }) => ({
      ...booking,
      property,
      tenant,
    }));
  }

  const tenantBookings = await db
    .select({
      booking: bookings,
      property: properties,
      tenant: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(bookings)
    .innerJoin(properties, eq(bookings.propertyId, properties.id))
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.userId, userId));

  return tenantBookings.map(({ booking, property, tenant }) => ({
    ...booking,
    property,
    tenant,
  }));
};

export const updateBookingStatus = async (
  env: Env,
  userId: string,
  role: string,
  bookingId: string,
  action: "accept" | "reject" | "cancel",
) => {
  const db = getDb(env);

  const bookingList = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId));

  const booking = bookingList[0];

  if (!booking) {
    throw new Error("Booking not found");
  }

  const propertyList = await db
    .select()
    .from(properties)
    .where(eq(properties.id, booking.propertyId));

  const property = propertyList[0];

  if (!property) {
    throw new Error("Property associated with booking not found");
  }

  if (action === "cancel") {
    if (booking.userId !== userId) {
      throw new Error("Unauthorized to cancel this booking");
    }
    const [updatedBooking] = await db
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updatedBooking;
  }

  if (action === "accept" || action === "reject") {
    if (role !== "landlord") {
      throw new Error("Only landlords can accept or reject bookings");
    }
    if (property.landlordId !== userId) {
      throw new Error("Unauthorized to modify this booking");
    }
    const status = action === "accept" ? "approved" : "rejected";

    const updatedBooking = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(bookings)
        .set({ status, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId))
        .returning();

      if (action === "accept") {
        const contractId = `contract_${ulid()}`;
        await tx.insert(contracts).values({
          id: contractId,
          propertyId: booking.propertyId,
          tenantId: booking.userId,
          landlordId: property.landlordId,
          bookingId: booking.id,
          startDate: booking.startDate,
          endDate: booking.endDate,
          depositAmount: property.price, // default deposit = 1 month rent
          monthlyRent: property.price,
          status: "draft",
        });
      }

      return updated;
    });

    return updatedBooking;
  }

  throw new Error("Invalid action");
};
