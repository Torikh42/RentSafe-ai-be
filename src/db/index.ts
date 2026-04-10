import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import type { Env } from "../env";

/**
 * @param env - The environment object containing HYPERDRIVE binding or DATABASE_URL
 */
export const getDb = (env: Env) => {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;

  const client = new pg.Client({ connectionString });
  client.connect();

  return drizzle(client, { schema });
};
