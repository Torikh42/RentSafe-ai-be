import { eq, and } from "drizzle-orm";
import type { getDb } from "../../db";
import { properties } from "../../db/schema";
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
