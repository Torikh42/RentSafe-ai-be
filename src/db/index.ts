import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import type { Env } from "../env";

/**
 * Creates a fresh database instance for each request.
 * IMPORTANT: Do NOT cache database instances globally in Cloudflare Workers.
 * Database connections created in one request context cannot be
* accessed from another request's handler due to Cloudflare's isolation model.
 *
 * Uses Cloudflare Hyperdrive for connection pooling in production,
 * falling back to direct Neon connection for local development.
 *
 * @param env - The environment object containing HYPERDRIVE binding or DATABASE_URL
 */
export const getDb = (env: Env) => {
  // Use HYPERDRIVE connection string when available
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;

  // When using Hyperdrive, Cloudflare recommends using standard drivers like node-postgres (pg)
  // instead of the Neon serverless driver to avoid protocol issues.
  const pool = new pg.Pool({ connectionString });
  return drizzle(pool, { schema });
};
