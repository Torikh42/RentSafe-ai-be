# Booking and Contracts Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 2.1 (Booking & Rental Agreement) endpoints including booking state transitions (accept, reject, cancel, list) and the foundational schema for Contracts.

**Architecture:**

- The Booking module handles the initial request from a tenant to rent a property. Landlords can accept or reject bookings, and tenants can cancel them.
- Accepting a booking should ideally trigger the creation of a draft `Contract`.
- We will add the `contracts` schema to the Drizzle configuration.
- We will build handlers inside `src/modules/bookings/` and create foundational structure for `src/modules/contracts/`.

**Tech Stack:** Hono, Drizzle ORM, Zod OpenAPI, PostgreSQL

---

### Task 1: Update Database Schema

**Files:**

- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add 'cancelled' to Bookings status enum**

Update the `status` column in the `bookings` table to include `'cancelled'`.

```typescript
export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  propertyId: text("property_id")
    .references(() => properties.id)
    .notNull(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status", {
    enum: ["pending", "approved", "rejected", "cancelled", "completed"],
  })
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Add `contracts` table**

Add the `contracts` table definition.

```typescript
export const contracts = pgTable("contracts", {
  id: text("id").primaryKey(),
  propertyId: text("property_id")
    .references(() => properties.id)
    .notNull(),
  tenantId: text("tenant_id")
    .references(() => users.id)
    .notNull(),
  landlordId: text("landlord_id")
    .references(() => users.id)
    .notNull(),
  bookingId: text("booking_id")
    .references(() => bookings.id)
    .notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  depositAmount: integer("deposit_amount").notNull(),
  monthlyRent: integer("monthly_rent").notNull(),
  contractText: text("contract_text"),
  fairnessScore: integer("fairness_score"),
  status: text("status", {
    enum: ["draft", "pending_signature", "active", "expired", "terminated"],
  })
    .default("draft")
    .notNull(),
  signedByTenant: boolean("signed_by_tenant").default(false).notNull(),
  signedByLandlord: boolean("signed_by_landlord").default(false).notNull(),
  signedAt: timestamp("signed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 3: Generate and apply migrations**

Run the commands to push/migrate the new schema changes.

```bash
bun db:push
```

---

### Task 2: Implement Booking Schemas & Routes

**Files:**

- Create: `src/modules/bookings/bookings.schema.ts`
- Create: `src/modules/bookings/bookings.routes.ts`

- [ ] **Step 1: Define Schemas**

```typescript
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
```

- [ ] **Step 2: Define Routes**

```typescript
import { createRoute, z } from "@hono/zod-openapi";
import {
  bookingResponseSchema,
  bookingsListResponseSchema,
  createBookingSchema,
} from "./bookings.schema";

const paramIdSchema = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const errorResponseSchema = z.object({ message: z.string() });

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
```

---

### Task 3: Implement Booking Handlers and Service

**Files:**

- Create: `src/modules/bookings/bookings.service.ts`
- Create: `src/modules/bookings/bookings.handlers.ts`
- Create: `src/modules/bookings/index.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Write Booking Service**

Implement functions: `createBooking`, `getMyBookings`, `updateBookingStatus`.
Note: Changing status should verify ownership (tenant for cancel, landlord for accept/reject). We'll need to check the property landlordId for accept/reject.

- [ ] **Step 2: Write Handlers**

Implement `createBookingHandler`, `getMyBookingsHandler`, `acceptBookingHandler`, `rejectBookingHandler`, `cancelBookingHandler`.
Ensure proper Role checks (e.g. landlord required for accept/reject).

- [ ] **Step 3: Setup Router and Mount**

In `src/modules/bookings/index.ts`, use `createRouter()` and attach all routes to handlers.
In `src/app.ts`, mount the router: `app.route("/api/bookings", bookingsRouter)`.

- [ ] **Step 4: Update OpenAPI Docs**

Run `bun run openapi:generate` to update the specs.

- [ ] **Step 5: Verify and Commit**

Run `bun run fl` and `bun run check`.
Commit changes.
