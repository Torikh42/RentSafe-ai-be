# AGENTS.md - Project Context & Directives

> **SYSTEM INSTRUCTION:** ALL AI AGENTS WORKING ON THIS REPOSITORY MUST READ AND ADHERE TO THE FOLLOWING ARCHITECTURAL GUIDELINES. DO NOT DEVIATE WITHOUT EXPLICIT USER OVERRIDE.

## 1. Project Overview

**Project:** api-Rentsafe-ai — Rentsafe-ai Platform Backend
**Goal:** Backend API untuk platform Rentsafe-ai. Mengelola autentikasi pengguna (Google OAuth), dan fitur lainnya.

## 2. Tech Stack (Strict)

| Layer | Tech |
|---|---|
| Runtime | **Cloudflare Workers** (via Wrangler) |
| Framework | [Hono](https://hono.dev) v4+ |
| OpenAPI | `@hono/zod-openapi` (`createRoute` + Zod schemas) |
| Auth | [Better Auth](https://www.better-auth.com) (Google OAuth) |
| Database | PostgreSQL |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Validation | Zod |
| Language | TypeScript (strict) |
| Linting | Oxlint & Oxfmt |

> ⚠️ **Cloudflare Workers** bukan Node.js/Bun. Environment variables diakses via `c.env`, **bukan** `process.env`.

---

## 3. Architecture & Core Philosophy

Struktur **Modular Monolith** dengan pemisahan layer yang jelas:

- **Modules:** Vertical slices per domain (e.g., `auth`, `quiz`, `promo`)
- **Services:** Pure business logic. **JANGAN** pass Hono Context (`c`) ke Service
- **Factory:** Single source of truth untuk pembuatan Hono app

---

## 4. The "Golden Rules" (Violations = Immediate Rejection)

### Rule 1: The Factory Rule

**JANGAN** gunakan `new Hono()` atau `new OpenAPIHono()` langsung di module. **SELALU** gunakan `createRouter()` dari `src/factory.ts`.

```typescript
// ✅ GOOD
import { createRouter } from "@/factory";
const router = createRouter();

// ❌ BAD
import { Hono } from "hono";
const router = new Hono(); // Type safety hilang!
```

### Rule 2: The OpenAPI Documentation Rule

**SELALU** gunakan `createRoute` + `router.openapi()` dari `@hono/zod-openapi` untuk mendokumentasikan route.

```typescript
// ✅ GOOD
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/factory";

const router = createRouter();

const getHealthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ status: z.string() }) } },
      description: "Service is healthy",
    },
  },
});

router.openapi(getHealthRoute, (c) => c.json({ status: "ok" }, 200));

// ❌ BAD
router.get("/health", (c) => c.json({ status: "ok" })); // Tidak terdokumentasi!
```

### Rule 3: The Validation Rule

**SELALU** definisikan request schema di `createRoute` menggunakan `request.body`, `request.params`, atau `request.query`. Data di-validate otomatis oleh framework.

```typescript
const createQuizRoute = createRoute({
  method: "post",
  path: "/quiz",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ personalityCode: z.string().min(1) }),
        },
      },
    },
  },
  responses: { 201: { ... } },
});

router.openapi(createQuizRoute, async (c) => {
  const { personalityCode } = c.req.valid("json"); // ← Already validated & typed
  ...
});
```

### Rule 4: The Service Purity Rule

Services harus bisa di-test tanpa Hono. Pass primitives, bukan Context.

```typescript
// ✅ GOOD
export const calculateScore = (userId: string, answers: string[]) => { ... };

// ❌ BAD
export const calculateScore = async (c: Context) => { ... };
```

### Rule 5: The Environment Variable Rule

**JANGAN** pakai `process.env`. Di Cloudflare Workers, env diakses via `c.env`.

```typescript
// ✅ GOOD
app.get("/", (c) => {
  const dbUrl = c.env.DATABASE_URL;
  ...
});

// ❌ BAD
const dbUrl = process.env.DATABASE_URL; // Undefined di Workers!
```

### Rule 6: The Zod ISO Date Rule

Gunakan `z.string().datetime()` bukan `z.date()` untuk field timestamp di OpenAPI schema (z.date() tidak bisa direpresentasikan di JSON Schema).

```typescript
// ✅ GOOD
schema: z.object({ createdAt: z.string().datetime() })

// ❌ BAD
schema: z.object({ createdAt: z.date() }) // Crash saat generate OpenAPI!
```

### Rule 7: The Import Direction Rule

- `modules/` → imports → `db/schema/`, `auth.ts`, `env.ts`
- `services/` → imports → `db/schema/`
- ❌ `modules/A` → imports → `modules/B` (Gunakan shared service)

---

## 5. Directory Structure

```
src/
├── index.ts               # Entry point (export default app)
├── app.ts                 # Main app: mount middleware + semua module
├── auth.ts                # Better Auth config & cache
├── env.ts                 # Zod env schema & Env type
├── factory.ts             # createRouter(), AppEnv, AppContext
│
├── db/
│   ├── index.ts           # getDb() dengan instance caching
│   └── schema.ts          # Drizzle schema (Better Auth + domain tables)
│
├── middlewares/
│   └── cors.ts            # CORS middleware
│
├── modules/
│   ├── auth/
│   │   └── index.ts       # /api/auth/* → Better Auth handler
│   ├── dev/               # DEV ONLY — hapus sebelum production
│   │   └── index.ts
│   └── [domain]/          # Setiap fitur baru di sini
│       ├── [name].routes.ts    # createRoute definitions
│       ├── [name].handlers.ts  # Hono handlers (glue code)
│       ├── [name].schema.ts    # Zod schemas (request/response)
│       └── index.ts            # createRouter() + mount routes
│
├── services/              # Cross-module business logic (opsional)
│   └── [name].service.ts
│
└── scripts/
    └── generate-openapi.ts # bun openapi:generate
```

---

## 6. Development Workflow (Cara Tambah Fitur Baru)

### Phase 1: Data
1. Update `src/db/schema.ts` dengan tabel baru
2. `bun run push` untuk sync ke DB

### Phase 2: Contract
3. Buat `src/modules/[domain]/[name].schema.ts` dengan Zod schemas
4. Buat `src/modules/[domain]/[name].routes.ts` dengan `createRoute()`

### Phase 3: Logic
5. Buat `src/modules/[domain]/[name].handlers.ts`
6. Buat `src/modules/[domain]/index.ts` pakai `createRouter()` + mount routes
7. Daftarkan module di `src/app.ts`

### Phase 4: Docs
8. `bun run openapi:generate` untuk update `openapi.json`

---

## 7. Code Quality Checklist

Sebelum commit:

```bash
bun run fl     # Format & lint
bun run check  # TypeScript type check
```

**Rules:**
- ✅ Tidak ada `new Hono()` / `new OpenAPIHono()` di module (gunakan `createRouter()`)
- ✅ Tidak ada `process.env` (gunakan `c.env`)
- ✅ Semua route pakai `createRoute` + `router.openapi()`
- ✅ Tidak ada `z.date()` di OpenAPI schema (gunakan `z.string().datetime()`)
- ✅ Services tidak menerima Hono Context
- ✅ Tidak ada cross-module imports

---

## 8. Dev-Only Routes

Route `/test/*` di `src/modules/dev/` **HANYA** untuk development. Sebelum production:
1. Hapus `import { devRouter }` dari `src/app.ts`
2. Hapus `app.route("/test", devRouter)` dari `src/app.ts`
3. Folder `src/modules/dev/` bisa dihapus

---

## 9. Endpoints Reference

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET/POST` | `/api/auth/*` | Better Auth (sign-in, callback, get-session, sign-out) |
| `GET` | `/api/me` | Info user yang sedang login |
| `GET` | `/doc` | OpenAPI JSON spec |
| `GET` | `/reference` | Scalar UI (API docs) |