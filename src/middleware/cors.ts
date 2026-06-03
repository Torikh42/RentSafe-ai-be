import { cors } from "hono/cors";
import { factory } from "../factory";

export const corsMiddleware = factory.createMiddleware((c, next) => {
  const frontendUrls = c.env.FRONTEND_URLS;
  const allowedOrigins = Array.isArray(frontendUrls)
    ? frontendUrls
    : (frontendUrls as string).split(",").map((url) => url.trim());

  return cors({
    origin: (origin) => {
      // When there's no origin (e.g. server-to-server), allow it
      if (!origin) return origin;

      // Only allow explicitly listed origins — never return "*" with credentials: true
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      return undefined;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "Set-Cookie",
      "X-Requested-With",
      // Better Auth uses these internally for CSRF and session
      "x-better-auth-url",
      "x-better-auth-secret",
    ],
    exposeHeaders: ["Content-Length", "Set-Cookie"],
    maxAge: 600,
    credentials: true,
  })(c, next);
});
