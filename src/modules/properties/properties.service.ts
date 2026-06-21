import { eq, and, desc, sql, lt } from "drizzle-orm";
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
        type: data.type,
        rooms: data.rooms,
        facilities: data.facilities || [],
        images: data.images || [],
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

  async getProperties(cursor?: string, limit: number = 12) {
    let query = this.db
      .select()
      .from(properties)
      .orderBy(desc(properties.createdAt))
      .limit(limit + 1)
      .$dynamic();

    if (cursor) {
      try {
        const decodedDate = new Date(
          Buffer.from(cursor, "base64").toString("utf-8"),
        );
        query = query.where(lt(properties.createdAt, decodedDate));
      } catch {
        // Invalid cursor, ignore
      }
    }

    const result = await query;
    const hasNext = result.length > limit;

    if (hasNext) {
      result.pop();
    }

    const nextCursor =
      result.length > 0
        ? Buffer.from(
            result[result.length - 1].createdAt.toISOString(),
          ).toString("base64")
        : undefined;

    return {
      data: result,
      pagination: {
        limit,
        hasNext,
        nextCursor,
      },
    };
  }

  async getPropertyById(id: string) {
    const [result] = await this.db
      .select({
        property: properties,
        landlord: {
          id: users.id,
          name: users.name,
          image: users.image,
        },
      })
      .from(properties)
      .leftJoin(users, eq(properties.landlordId, users.id))
      .where(eq(properties.id, id));

    if (!result) return null;

    return {
      ...result.property,
      landlord: result.landlord || null,
    };
  }

  async searchProperties(
    query: string,
    filters?: {
      minPrice?: number;
      maxPrice?: number;
      available?: boolean;
    },
    cursor?: string,
    limit: number = 12,
  ) {
    let baseQuery = this.db.select().from(properties).$dynamic();
    const whereClauses = [];

    // Search by FTS
    if (query) {
      whereClauses.push(
        sql`to_tsvector('simple', ${properties.name} || ' ' || ${properties.address}) @@ websearch_to_tsquery('simple', ${query})`,
      );
    }

    // Filter by availability
    if (filters?.available !== undefined) {
      whereClauses.push(eq(properties.available, filters.available));
    }

    // Filter by price range
    if (filters?.minPrice !== undefined) {
      whereClauses.push(sql`${properties.price} >= ${filters.minPrice}`);
    }
    if (filters?.maxPrice !== undefined) {
      whereClauses.push(sql`${properties.price} <= ${filters.maxPrice}`);
    }

    // Cursor pagination
    if (cursor) {
      try {
        const decodedDate = new Date(
          Buffer.from(cursor, "base64").toString("utf-8"),
        );
        whereClauses.push(lt(properties.createdAt, decodedDate));
      } catch {
        // Invalid cursor
      }
    }

    if (whereClauses.length > 0) {
      baseQuery = baseQuery.where(and(...whereClauses));
    }

    const result = await baseQuery
      .orderBy(desc(properties.createdAt))
      .limit(limit + 1);

    const hasNext = result.length > limit;
    if (hasNext) {
      result.pop();
    }

    const nextCursor =
      result.length > 0
        ? Buffer.from(
            result[result.length - 1].createdAt.toISOString(),
          ).toString("base64")
        : undefined;

    return {
      data: result,
      pagination: {
        limit,
        hasNext,
        nextCursor,
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
