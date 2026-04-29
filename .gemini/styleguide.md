# Code Quality & Style Guide (AI Reviewer Reference)

> **Project:** RentSafe AI — Backend API
> **Stack:** Cloudflare Workers + Hono + @hono/zod-openapi + Better Auth + Drizzle ORM + Neon PostgreSQL + Hyperdrive
> **Last Updated:** 10 April 2026

This document is the authoritative guide for maintaining code quality, architectural integrity, and stylistic consistency in the **rentsafe-ai** project.

**Related Documents:**

- `GEMINI.MD` — Full AI assistant guide with service guidelines
- `AGENTS.MD` — Architecture rules & 8 Golden Rules
- `IMPLEMENTATION_PLAN.md` — Phase-by-phase implementation plan (50+ endpoints)
- `Geost_RentSafeAI.md` — Product specification

---

## 1. Core Architectural Principles

### 1.1. Modular Monolith

- **Standard:** Every new feature must reside in its own module under `src/modules/[domain]`.
- **Domains:** `auth`, `users`, `properties`, `bookings`, `contracts`, `inspections`, `escrows`, `payments`, `disputes`, `subscriptions`, `dashboard`
- **Reasoning:** Modular structure enforces clear domain boundaries without the infra overhead of microservices.
- **Reviewer Action:** Reject any PR that places domain-specific logic in root-level files if it belongs in a module.
- **NO cross-module imports:** `modules/A` must NOT import from `modules/B` — use shared services in `src/services/` instead.

### 1.2. The Factory Pattern (Mandatory)

- **Standard:** Use `createRouter()` from `src/factory.ts` — never `new Hono()` or `new OpenAPIHono()`.
- **Why Alternative is Bad:** It duplicates `AppEnv` types, risks inconsistent middleware, and breaks OpenAPI type inference.
- **Reviewer Action:** Flag any `new Hono()` or `new OpenAPIHono()` as a critical violation.

---

## 2. Type Safety & Contract Integrity

### 2.1. Narrowing Over Widening

- **Standard:** Use `as const` for literals. Use `satisfies` operator for objects that must adhere to a type.

  ```typescript
  // ✅ GOOD
  const ROLES = ["admin", "tenant", "landlord"] as const;

  // ❌ BAD
  const ROLES: string[] = ["admin", "tenant", "landlord"];
  ```

### 2.2. No `any` or `{}`

- **Standard:** Never use `as any`, `: any`, or `{}` as a type. Use proper narrowing or `Record<string, never>` for empty objects.

### 2.3. Infer from Zod Schemas

- **Standard:** Use `z.infer<typeof schema>` for types derived from Zod schemas — never duplicate manually.
- **Standard:** Prefer `createInsertSchema` / `createSelectSchema` from `drizzle-zod` where possible. Override timestamp fields to `z.string().datetime()`.

### 2.4. Discriminated Unions for Status Fields

- **Standard:** Use TypeScript discriminated unions for status/enum fields instead of raw strings.

  ```typescript
  // ✅ GOOD
  type ContractStatus =
    | "draft"
    | "pending_signature"
    | "active"
    | "expired"
    | "terminated";

  // ❌ BAD
  type ContractStatus = string; // Too broad
  ```

---

## 3. Data Layer (Drizzle & PostgreSQL via Hyperdrive)

### 3.1. NO Database Connection Caching

- **Standard:** ALWAYS create fresh database clients per request — `getDb(env)` creates new `pg.Client` (NOT pool).
- **Why:** Cloudflare Workers isolate freeze will kill TCP connections → hangs forever → 500 errors.
- **Hyperdrive:** Cloudflare handles connection pooling at the edge via `env.HYPERDRIVE.connectionString`.

  ```typescript
  // ✅ GOOD — Fresh client per request
  const db = getDb(c.env);

  // ❌ BAD — Module-level singleton
  const db = getDb(env); // At module scope — NEVER DO THIS
  ```

- **Reviewer Action:** Flag any code that stores `getDb()` result in a module-level variable.

### 3.2. Drizzle Destructuring Safety

- **Standard:** Always validate Drizzle destructured returns before accessing properties.

  ```typescript
  // ✅ GOOD
  const [inserted] = await db.insert(users).values(data).returning();
  if (!inserted) throw new Error("Insert failed");

  // ❌ BAD
  const [inserted] = await db.insert(users).values(data).returning();
  return inserted.id; // inserted might be undefined!
  ```

### 3.3. Schema Location

- **Standard:** All Drizzle schemas live in `src/db/schema.ts` — do NOT create separate schema files per module.

---

## 4. Cloudflare Workers Constraints

### 4.1. Environment Variables

- **Standard:** NEVER use `process.env`. Always use `c.env` in handlers.

  ```typescript
  // ✅ GOOD
  const auth = getAuth(c.env);

  // ❌ BAD
  const url = process.env.DATABASE_URL;
  ```

### 4.2. No Long-Running Operations

- **Standard:** Cloudflare Workers have CPU time limits. Avoid synchronous heavy computation in request handlers. Use `c.executionCtx.waitUntil()` for fire-and-forget tasks.

### 4.3. Edge-Compatible Imports

- **Standard:** Avoid Node.js-only APIs (`fs`, `path`, `crypto` from Node) in Worker code. Use Web APIs (`crypto.randomUUID()`, `fetch`, etc.).

### 4.4. Isolate Freeze Awareness

- **Standard:** Do NOT cache I/O objects (database clients, HTTP clients, AI clients) at module scope.
- **Why:** Isolate freeze kills TCP connections. On next request, cached object is dead → hang.
- **Reviewer Action:** Flag any module-level variable that holds I/O objects.

---

## 5. API Documentation & Validation

### 5.1. @hono/zod-openapi Enforcement

- **Standard:** Every production route MUST use `createRoute()` + `router.openapi()`. NO bare `router.get()` / `router.post()`.
- **Standard:** Every `createRoute` MUST have: `method`, `path`, `tags`, `summary`, `responses`.
- **Reasoning:** Documentation is code. "Code-First, Doc-Always" approach enables frontend SDK generation.
- **Reviewer Action:** Flag any route missing `tags`, `summary`, or `responses` in its `createRoute()`.

### 5.2. ISO Dates

- **Standard:** Use `z.string().datetime()` — never `z.date()` in OpenAPI schemas.

  ```typescript
  // ✅ GOOD
  schema: z.object({ createdAt: z.string().datetime() });

  // ❌ BAD
  schema: z.object({ createdAt: z.date() }); // Breaks OpenAPI generation!
  ```

### 5.3. Request Validation

- **Standard:** Define request schema in `createRoute` using `request.body`, `request.params`, or `request.query`.
- **Standard:** Use `c.req.valid("json")`, `c.req.valid("param")`, `c.req.valid("query")` in handlers — never parse manually.

---

## 6. Service Layer Guidelines

### 6.1. Pure Business Logic

- **Standard:** Services must be testable without Hono. Pass primitives, NOT Context.

  ```typescript
  // ✅ GOOD
  export const analyzePhoto = (photoUrl: string, apiKey: string) => { ... };

  // ❌ BAD
  export const analyzePhoto = (c: Context, photoUrl: string) => { ... };
  ```

### 6.2. Planned Services

| Service      | File                                   | Purpose                   |
| ------------ | -------------------------------------- | ------------------------- |
| AI Service   | `src/services/ai.service.ts`           | Gemini/OpenRouter wrapper |
| R2 Storage   | `src/services/r2.service.ts`           | File upload, delete, URL  |
| Midtrans     | `src/services/midtrans.service.ts`     | Payment & Escrow          |
| Notification | `src/services/notification.service.ts` | Email/push notifications  |
| Reputation   | `src/services/reputation.service.ts`   | Calculate user scores     |

### 6.3. Service Purity

- **Standard:** Services should NOT import from `hono` or access `c.env`.
- **Standard:** Pass environment variables explicitly as function parameters.

---

## 7. Async & Performance

### 7.1. Parallelism Over Serialization

- **Standard:** Use `Promise.all` for independent async tasks.

  ```typescript
  // ✅ GOOD
  const [user, session] = await Promise.all([getUser(), getSession()]);

  // ❌ BAD
  const user = await getUser();
  const session = await getSession();
  ```

### 7.2. Handler Size

- **Standard:** Handlers should be < 50 lines. Extract logic to services.
- **Reviewer Action:** Flag handlers that exceed 50 lines.

---

## 8. Error Handling

### 8.1. Explicit Error Responses

- **Standard:** Return consistent JSON error responses. Use typed status codes.

  ```typescript
  // ✅ GOOD
  return c.json({ message: "Unauthorized" }, 401);

  // ❌ BAD
  throw new Error("Unauthorized"); // Unhandled — crashes Worker
  ```

### 8.2. Global Error Handler

- **Standard:** Use `app.onError()` for fallback error handling (already configured in `src/app.ts`).

---

## 9. Development Workflow

### 9.1. Adding New Features

```
1. Update src/db/schema.ts → bun db:push
2. Create [name].schema.ts (Zod schemas)
3. Create [name].routes.ts (createRoute definitions)
4. Create [name].handlers.ts (Hono handlers)
5. Create index.ts (createRouter + mount routes)
6. Register module in src/app.ts
7. bun run openapi:generate
8. bun run fl && bun run check
```

### 9.2. Pre-commit Checklist

```bash
bun run fl     # Format & lint (oxfmt + oxlint)
bun run check  # TypeScript type check (tsc --noEmit)
```

### 9.3. Dev-Only Routes

- Route `/test/*` in `src/modules/dev/` is DEV ONLY.
- Before production: remove from `src/app.ts` and delete folder.

---

## 10. Summary Checklist for AI Reviewer

| Category       | Must Have                                  | Immediate Rejection                |
| :------------- | :----------------------------------------- | :--------------------------------- |
| **Hono**       | `createRouter()` from factory              | `new Hono()` / `new OpenAPIHono()` |
| **OpenAPI**    | `createRoute` + `openapi()` on every route | Bare `router.get()` without docs   |
| **CF Workers** | `c.env` for all env access                 | `process.env` anywhere             |
| **Types**      | `z.string().datetime()` for timestamps     | `z.date()` in schemas              |
| **Types**      | No `any` or unsafe casts                   | `as any`, `: any`, `{}`            |
| **DB**         | Fresh client per request (no singletons)   | Module-level DB instances          |
| **DB**         | `!result` check after Drizzle destructure  | Unchecked destructured queries     |
| **Logic**      | Services taking primitives                 | Services taking `Context`          |
| **Size**       | Handlers < 50 lines                        | Mega-handlers                      |
| **Imports**    | No cross-module imports                    | `modules/A` → `modules/B`          |
| **Services**   | No Hono imports in services                | `import { Context } from "hono"`   |

---

**End of Guide**
