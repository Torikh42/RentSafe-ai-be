import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  password: text("password"), // nullable for OAuth users
  role: text("role", { enum: ["tenant", "landlord", "admin"] })
    .default("tenant")
    .notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const properties = pgTable("properties", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  price: integer("price").notNull(),
  description: text("description"),
  image: text("image"), // keep for backward compatibility
  type: text("type", { enum: ["kos", "apartemen"] })
    .default("kos")
    .notNull(),
  rooms: integer("rooms").default(1).notNull(),
  facilities: text("facilities").array(),
  images: text("images").array(),

  available: boolean("available").default(true).notNull(),
  landlordId: text("landlord_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

// Better Auth tables
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const inspections = pgTable("inspections", {
  id: text("id").primaryKey(),
  propertyId: text("property_id")
    .references(() => properties.id)
    .notNull(),
  landlordId: text("landlord_id")
    .references(() => users.id)
    .notNull(),
  type: text("type", { enum: ["pre", "post"] }).notNull(),
  referenceInspectionId: text("reference_inspection_id"),
  comparisonReport: text("comparison_report"),
  summary: text("summary"),
  status: text("status", { enum: ["pending", "completed", "failed"] })
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inspectionImages = pgTable("inspection_images", {
  id: text("id").primaryKey(),
  inspectionId: text("inspection_id")
    .references(() => inspections.id)
    .notNull(),
  url: text("url").notNull(),
  aiAnalysis: text("ai_analysis"),
});

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
