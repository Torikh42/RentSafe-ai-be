import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".dev.vars" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  console.log("Connected to database. Dropping tables...");

  // Hapus semua tabel dengan CASCADE untuk memutus relasi foreign key
  await client.query(`
    DROP TABLE IF EXISTS "bookings" CASCADE;
    DROP TABLE IF EXISTS "properties" CASCADE;
    DROP TABLE IF EXISTS "session" CASCADE;
    DROP TABLE IF EXISTS "account" CASCADE;
    DROP TABLE IF EXISTS "verification" CASCADE;
    DROP TABLE IF EXISTS "users" CASCADE;
  `);

  console.log(
    "SUCCESS: All tables dropped. You can now run 'bun x drizzle-kit push'.",
  );
} catch (e) {
  console.error("ERROR dropping tables:", e);
} finally {
  await client.end();
}
