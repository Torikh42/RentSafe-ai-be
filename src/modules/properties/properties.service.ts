import { eq, and, desc, sql } from "drizzle-orm";
import type { getDb } from "../../db";
import { properties, users } from "../../db/schema";
import type { z } from "zod";
import type {
  createPropertySchema,
  updatePropertySchema,
} from "./properties.schema";

export class PropertiesService {
  constructor(private db: ReturnType<typeof getDb>) {}

  async createProperty(
    landlordId: string,
    data: z.infer<typeof createPropertySchema>,
  ) {
    const id = crypto.randomUUID();
    const [property] = await this.db
      .insert(properties)
      .values({
        id,
        landlordId,
        name: data.name,
        address: data.address,
        price: data.price,
        description: data.description,
        image: data.image,
        available: data.available,
      })
      .returning();

    return property;
  }

  async getMyProperties(landlordId: string) {
    return await this.db
      .select()
      .from(properties)
      .where(eq(properties.landlordId, landlordId));
  }

  async getProperties(page: number = 1, limit: number = 12) {
    const offset = (page - 1) * limit;

    const result = await this.db
      .select()
      .from(properties)
      .orderBy(desc(properties.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(properties);

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getPropertyById(id: string) {
    const [property] = await this.db
      .select()
      .from(properties)
      .where(eq(properties.id, id));

    if (!property) return null;

    // Get landlord info
    const [landlord] = await this.db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, property.landlordId));

    return {
      ...property,
      landlord: landlord || null,
    };
  }

  async searchProperties(
    query: string,
    filters?: {
      minPrice?: number;
      maxPrice?: number;
      available?: boolean;
    },
    page: number = 1,
    limit: number = 12,
  ) {
    const offset = (page - 1) * limit;
    let baseQuery = this.db.select().from(properties).$dynamic();

    // Search by name or address
    if (query) {
      baseQuery = baseQuery.where(
        sql`${properties.name} ILIKE ${"%" + query + "%"} OR ${properties.address} ILIKE ${"%" + query + "%"}`,
      );
    }

    // Filter by availability
    if (filters?.available !== undefined) {
      baseQuery = baseQuery.where(eq(properties.available, filters.available));
    }

    // Filter by price range
    if (filters?.minPrice !== undefined) {
      baseQuery = baseQuery.where(
        sql`${properties.price} >= ${filters.minPrice}`,
      );
    }
    if (filters?.maxPrice !== undefined) {
      baseQuery = baseQuery.where(
        sql`${properties.price} <= ${filters.maxPrice}`,
      );
    }

    const result = await baseQuery
      .orderBy(desc(properties.createdAt))
      .limit(limit)
      .offset(offset);

    // Get count for pagination
    let countQuery = this.db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .$dynamic();

    if (query) {
      countQuery = countQuery.where(
        sql`${properties.name} ILIKE ${"%" + query + "%"} OR ${properties.address} ILIKE ${"%" + query + "%"}`,
      );
    }

    if (filters?.available !== undefined) {
      countQuery = countQuery.where(
        eq(properties.available, filters.available),
      );
    }

    if (filters?.minPrice !== undefined) {
      countQuery = countQuery.where(
        sql`${properties.price} >= ${filters.minPrice}`,
      );
    }
    if (filters?.maxPrice !== undefined) {
      countQuery = countQuery.where(
        sql`${properties.price} <= ${filters.maxPrice}`,
      );
    }

    const [countResult] = await countQuery;
    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async updateProperty(
    propertyId: string,
    landlordId: string,
    data: z.infer<typeof updatePropertySchema>,
  ) {
    const [property] = await this.db
      .update(properties)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(properties.id, propertyId),
          eq(properties.landlordId, landlordId),
        ),
      )
      .returning();

    return property;
  }

  async deleteProperty(propertyId: string, landlordId: string) {
    await this.db
      .delete(properties)
      .where(
        and(
          eq(properties.id, propertyId),
          eq(properties.landlordId, landlordId),
        ),
      );
    return true;
  }
}
