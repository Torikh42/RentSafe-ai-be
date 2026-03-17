/**
 * Generate OpenAPI spec ke file openapi.json
 *
 * Usage: bun run openapi:generate
 * Output: ./openapi.json (di root project)
 *
 * @hono/zod-openapi's getOpenAPIDocument() tidak perlu HTTP request
 * dan tidak menjalankan middleware — langsung baca registered routes.
 */
import { app } from "../app";
import * as fs from "node:fs";

async function generate() {
  console.log("Generating OpenAPI schema...");

  try {
    const spec = app.getOpenAPIDocument({
      openapi: "3.0.0",
      info: {
        version: "1.0.0",
        title: "RentSafe-ai API",
        description: "Backend API untuk RentSafe-ai platform",
      },
    });

    const output = "./openapi.json";
    fs.writeFileSync(output, JSON.stringify(spec, null, 2));
    console.log(`✅ OpenAPI schema generated: ${output}`);
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Error:", e.stack || e.message);
    } else {
      console.error("Error:", e);
    }
    process.exit(1);
  }
}

generate();
