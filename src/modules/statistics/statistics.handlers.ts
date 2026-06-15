import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../factory";
import { getAuth } from "../../auth";
import { getDb } from "../../db";
import { properties, bookings, contracts, users } from "../../db/schema";
import { eq, inArray } from "drizzle-orm";
import { getStatisticsRoute } from "./statistics.routes";

export const getStatisticsHandler: RouteHandler<
  typeof getStatisticsRoute,
  AppEnv
> = async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  // @ts-ignore
  const role = (session.user.role as string) || "tenant";
  const userId = session.user.id;
  const db = getDb(c.env);

  try {
    if (role === "landlord") {
      const landlordProperties = await db
        .select()
        .from(properties)
        .where(eq(properties.landlordId, userId));

      const propertyIds = landlordProperties.map((p) => p.id);

      let landlordBookings: Array<{
        booking: typeof bookings.$inferSelect;
        property: typeof properties.$inferSelect;
        tenant: { id: string; name: string; email: string };
      }> = [];
      if (propertyIds.length > 0) {
        landlordBookings = await db
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
          .where(inArray(bookings.propertyId, propertyIds));
      }

      let landlordContracts: Array<{
        contract: typeof contracts.$inferSelect;
        property: typeof properties.$inferSelect;
        tenant: { id: string; name: string; email: string };
      }> = [];
      if (propertyIds.length > 0) {
        landlordContracts = await db
          .select({
            contract: contracts,
            property: properties,
            tenant: {
              id: users.id,
              name: users.name,
              email: users.email,
            },
          })
          .from(contracts)
          .innerJoin(properties, eq(contracts.propertyId, properties.id))
          .innerJoin(users, eq(contracts.tenantId, users.id))
          .where(inArray(contracts.propertyId, propertyIds));
      }

      const totalProps = landlordProperties.length;
      const activeLeases = landlordProperties.filter(
        (p) => !p.available,
      ).length;
      const pendingBookings = landlordBookings.filter(
        (b) => b.booking.status === "pending",
      ).length;
      const monthlyRevenue = landlordProperties
        .filter((p) => !p.available)
        .reduce((sum, p) => sum + p.price, 0);

      return c.json(
        {
          message: "Landlord statistics",
          data: {
            role: "landlord",
            totalProperties: totalProps,
            activeLeases,
            pendingBookings,
            monthlyRevenue,
            properties: landlordProperties,
            bookings: landlordBookings.map((b) => ({
              ...b.booking,
              property: b.property,
              tenant: b.tenant,
            })),
            contracts: landlordContracts.map((co) => ({
              ...co.contract,
              property: co.property,
              tenant: co.tenant,
            })),
          },
        },
        200,
      );
    } else {
      const tenantBookings = await db
        .select({
          booking: bookings,
          property: properties,
          landlord: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(bookings)
        .innerJoin(properties, eq(bookings.propertyId, properties.id))
        .innerJoin(users, eq(properties.landlordId, users.id))
        .where(eq(bookings.userId, userId));

      const tenantContracts = await db
        .select({
          contract: contracts,
          property: properties,
          landlord: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(contracts)
        .innerJoin(properties, eq(contracts.propertyId, properties.id))
        .innerJoin(users, eq(contracts.landlordId, users.id))
        .where(eq(contracts.tenantId, userId));

      const activeRentals = tenantBookings.filter(
        (b) => b.booking.status === "approved",
      ).length;
      const pendingBookings = tenantBookings.filter(
        (b) => b.booking.status === "pending",
      ).length;
      const pendingSignatures = tenantContracts.filter(
        (c) =>
          c.contract.status === "pending_signature" &&
          !c.contract.signedByTenant,
      ).length;
      const monthlySpent = tenantBookings
        .filter((b) => b.booking.status === "approved")
        .reduce((sum, b) => sum + b.property.price, 0);

      return c.json(
        {
          message: "Tenant statistics",
          data: {
            role: "tenant",
            activeRentals,
            pendingBookings,
            pendingSignatures,
            monthlySpent,
            bookings: tenantBookings.map((b) => ({
              ...b.booking,
              property: b.property,
              landlord: b.landlord,
            })),
            contracts: tenantContracts.map((co) => ({
              ...co.contract,
              property: co.property,
              landlord: co.landlord,
            })),
          },
        },
        200,
      );
    }
  } catch (error) {
    console.error("Get statistics error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};
