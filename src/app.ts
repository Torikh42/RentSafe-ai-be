import { z } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { getAuth } from "./auth";
import { EnvSchema } from "./env";
import { createRouter } from "./factory";
import { corsMiddleware } from "./middleware/cors";
import { authRouter } from "./modules/auth";

const app = createRouter();

const openApiInfo = {
  version: "1.0.0",
  title: "RentSafe-ai API",
  description:
    "API Documentation untuk sistem Rentsafe-ai. Autentikasi utama menggunakan Google OAuth via Better-Auth.",
};

// cors pertama sebelum validation apapun
app.use("*", corsMiddleware);

// Env validation setelah CORS
app.use("*", async (c, next) => {
  const result = EnvSchema.safeParse(c.env);
  if (!result.success) {
    const errors = result.error.issues.map((i) => i.message);
    return c.json({ message: "Server misconfiguration", errors }, 500);
  }
  await next();
});

// Base OpenAPI Documentation
app.doc("/doc", {
  openapi: "3.0.0",
  info: openApiInfo,
});

const AuthApiSchema = z.object({
  paths: z
    .record(
      z.string(),
      z.record(
        z.string(),
        z.object({ tags: z.array(z.string()).optional() }).passthrough(),
      ),
    )
    .optional(),
  components: z
    .object({
      schemas: z.record(z.string(), z.unknown()).optional(),
      securitySchemes: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough()
    .optional(),
});

const openAPICache = new Map<string, unknown>();

app.get("/api/openapi.json", async (c) => {
  const cacheKey = c.env.DATABASE_URL;
  if (openAPICache.has(cacheKey)) return c.json(openAPICache.get(cacheKey));

  const auth = getAuth(c.env);
  const rawAuthSchema = await auth.api.generateOpenAPISchema();
  const authSchema = AuthApiSchema.parse(rawAuthSchema);

  const honoSchema = app.getOpenAPIDocument({
    openapi: "3.0.0",
    info: openApiInfo,
  });

  const authPaths = authSchema.paths || {};
  const authComponents = authSchema.components || {};

  const mergedPaths: Record<string, unknown> = { ...honoSchema.paths };
  for (const path in authPaths) {
    const methods = authPaths[path];
    for (const method in methods) {
      const routeInfo = methods[method];
      if (!routeInfo.tags) {
        routeInfo.tags = ["Auth"];
      }
    }
    mergedPaths[`/api/auth${path}`] = methods;
  }

  const mergedSchema = {
    ...honoSchema,
    paths: mergedPaths,
    components: {
      ...honoSchema.components,
      ...authComponents,
      schemas: {
        ...honoSchema.components?.schemas,
        ...authComponents.schemas,
      },
    },
  };

  openAPICache.set(cacheKey, mergedSchema);
  return c.json(mergedSchema);
});

app.get(
  "/reference",
  Scalar({
    pageTitle: "RentSafe-ai API Reference",
    theme: "kepler",
    sources: [{ url: "/api/openapi.json", title: "RentSafe-ai API" }],
  }),
);

// Auth — semua /api/auth/* didelegasikan ke Better Auth
app.route("/api/auth", authRouter);

app.get("/", (c) => c.text("RentSafe-ai API is running."));

app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

app.onError((err, c) => {
  console.error("Global Hono Error:", err);
  return c.json(
    {
      error:
        c.env.NODE_ENV === "development"
          ? err.message
          : "Internal Server Error",
      stack: c.env.NODE_ENV === "development" ? err.stack : undefined,
    },
    500,
  );
});

export { app };
