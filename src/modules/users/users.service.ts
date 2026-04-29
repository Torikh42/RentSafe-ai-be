import { eq } from "drizzle-orm";
import type { getDb } from "../../db";
import { users } from "../../db/schema";

export class UsersService {
  constructor(private db: ReturnType<typeof getDb>) {}

  async updateRole(userId: string, role: "tenant" | "landlord") {
    await this.db.update(users).set({ role }).where(eq(users.id, userId));

    return role;
  }
}
