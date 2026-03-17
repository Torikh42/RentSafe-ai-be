# Code Quality & Style Guide (AI Reviewer Reference)

This document is the authoritative guide for maintaining code quality, architectural integrity, and stylistic consistency in the **rentsafe-ai** project (Cloudflare Workers + Hono + @hono/zod-openapi).

---

## 1. Core Architectural Principles

### 1.1. Modular Monolith

- **Standard:** Every new feature must reside in its own module under `src/modules/[domain]`.
- **Reasoning:** Modular structure enforces clear domain boundaries without the infra overhead of microservices.
- **Reviewer Action:** Reject any PR that places domain-specific logic in root-level files if it belongs in a module.

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
  const ROLES = ["admin", "user"] as const;

  // ❌ BAD
  const ROLES: string[] = ["admin", "user"];
  ```

### 2.2. No `any` or `{}`

- **Standard:** Never use `as any`, `: any`, or `{}` as a type. Use proper narrowing or `Record<string, never>` for empty objects.

### 2.3. Infer from Zod Schemas

- **Standard:** Use `z.infer<typeof schema>` for types derived from Zod schemas — never duplicate manually.

---

## 3. Data Layer (Drizzle & Persistence)

### 3.1. DB Instance Caching

- **Standard:** Always use `getDb(c.env.DATABASE_URL)` — instance caching is handled internally by `src/db/index.ts`.
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

### 3.3. Schema Sync with `drizzle-zod`

- **Standard:** Derive API Zod schemas from DB schemas using `createInsertSchema` / `createSelectSchema` from `drizzle-zod` where possible. Override timestamp fields to `z.string().datetime()`.

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

- **Standard:** Cloudflare Workers have CPU time limits. Avoid synchronous heavy computation in request handlers. Use `waitUntil` for fire-and-forget tasks.

### 4.3. Edge-Compatible Imports

- **Standard:** Avoid Node.js-only APIs (`fs`, `path`, `crypto` from Node) in Worker code. Use Web APIs (`crypto.randomUUID()`, `fetch`, etc.).

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

---

## 6. Async & Performance

### 6.1. Parallelism Over Serialization

- **Standard:** Use `Promise.all` for independent async tasks.

  ```typescript
  // ✅ GOOD
  const [user, session] = await Promise.all([getUser(), getSession()]);

  // ❌ BAD
  const user = await getUser();
  const session = await getSession();
  ```

---

## 7. Error Handling

### 7.1. Explicit Error Responses

- **Standard:** Return consistent JSON error responses. Use typed status codes.

  ```typescript
  // ✅ GOOD
  return c.json({ message: "Unauthorized" }, 401);

  // ❌ BAD
  throw new Error("Unauthorized"); // Unhandled — crashes Worker
  ```

---

## 8. Summary Checklist for AI Reviewer

| Category       | Must Have                                  | Immediate Rejection                |
| :------------- | :----------------------------------------- | :--------------------------------- |
| **Hono**       | `createRouter()` from factory              | `new Hono()` / `new OpenAPIHono()` |
| **OpenAPI**    | `createRoute` + `openapi()` on every route | Bare `router.get()` without docs   |
| **CF Workers** | `c.env` for all env access                 | `process.env` anywhere             |
| **Types**      | `z.string().datetime()` for timestamps     | `z.date()` in schemas              |
| **Types**      | No `any` or unsafe casts                   | `as any`, `: any`, `{}`            |
| **DB**         | `!result` check after Drizzle destructure  | Unchecked destructured queries     |
| **Logic**      | Services taking primitives                 | Services taking `Context`          |
| **Size**       | Handlers < 50 lines                        | Mega-handlers                      |

---

**End of Guide**
