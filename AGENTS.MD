# AGENTS.md - Project Context & Directives

> **SYSTEM INSTRUCTION:** ALL AI AGENTS WORKING ON THIS REPOSITORY MUST READ AND ADHERE TO THE FOLLOWING ARCHITECTURAL GUIDELINES. DO NOT DEVIATE WITHOUT EXPLICIT USER OVERRIDE.

## 1. Project Overview

**Project:** RentSafe AI — Backend API
**Goal:** Platform AI-powered untuk menyelesaikan sengketa sewa kos-kosan & apartemen di Indonesia. Mengatasi "justice gap" di mana biaya hukum (IDR 5-15 juta) > nilai deposit (IDR 1-3 juta).

**Core Features:**
1. **AI Smart Contracts** — Generate kontrak sewa KUHPerdata-compliant dengan Gemini AI
2. **AI Property Inspection** — Gemini Vision API untuk dokumentasi kondisi properti (check-in/check-out)
3. **Smart Escrow** — Deposit dipegang Midtrans, dirilis otomatis berdasarkan AI verdict
4. **Automated Dispute Resolution** — AI sebagai arbiter netral (multi-round mediation)
5. **Two-way Reputation System** — Rating untuk tenant & landlord

**Target Users:**
- **Tenants:** Mahasiswa & young professionals (9.3 juta mahasiswa di Indonesia)
- **Landlords:** Pemilik kos-kosan & apartemen
- **Admin:** Platform moderator

**Dokumen Referensi:**
- `Geost_RentSafeAI.md` — Dokumen lengkap (background, solution, architecture, business model)
- `IMPLEMENTATION_PLAN.md` — Phase-by-phase implementation plan
- `QWEN.MD` — Detailed AI assistant guide (lebih lengkap dengan service guidelines)

---

## 2. Tech Stack (Strict)

| Layer | Tech | Keterangan |
|---|---|---|
| Runtime | **Cloudflare Workers** (via Wrangler) | Bukan Node.js/Bun |
| Framework | [Hono](https://hono.dev) v4+ | Lightweight web framework |
| OpenAPI | `@hono/zod-openapi` (`createRoute` + Zod schemas) | Route documentation |
| Auth | [Better Auth](https://www.better-auth.com) (Google OAuth) | Bukan Supabase |
| Database | PostgreSQL (Neon Serverless) | |
| Connection Pooling | **Cloudflare Hyperdrive** | Binding: `env.HYPERDRIVE` |
| ORM | [Drizzle ORM](https://orm.drizzle.team) | Type-safe query |
| Storage | **Cloudflare R2** | S3-compatible (foto inspection, contracts) |
| AI | **Google Gemini** / OpenRouter | Vision API + text generation |
| Payment | **Midtrans** | Escrow & subscription |
| Validation | Zod | Request/response validation |
| Language | TypeScript (strict) | No `any`, no `process.env` |
| Linting | Oxlint & Oxfmt | Fast lint & format |

> ⚠️ **Cloudflare Workers** bukan Node.js/Bun. Environment variables diakses via `c.env`, **bukan** `process.env`.
> ⚠️ **JANGAN** cache database connections sebagai singleton — isolate freeze akan memutus TCP → hang → 500 error.

---

## 3. Architecture & Core Philosophy

Struktur **Modular Monolith** dengan pemisahan layer yang jelas:

- **Modules:** Vertical slices per domain (e.g., `auth`, `properties`, `contracts`, `inspections`, `disputes`)
- **Services:** Pure business logic untuk cross-module concerns (AI, R2, Midtrans, notifications). **JANGAN** pass Hono Context (`c`) ke Service
- **Factory:** Single source of truth untuk pembuatan Hono app (`src/factory.ts`)
- **Database:** Semua schema di `src/db/schema.ts`. Instance dibuat fresh per request via `getDb(env)`

### Database Schema (High-Level)

**Tables yang sudah ada:**
- `users` — User dengan role (tenant/landlord/admin)
- `properties` — Data properti/kos
- `bookings` — Booking requests
- `session`, `account`, `verification` — Better Auth tables

**Tables yang akan ditambahkan (sesuai IMPLEMENTATION_PLAN.md):**
- `contracts` — Smart contracts (AI-generated, fairness scoring)
- `inspections` — Property inspection reports (check-in/check-out)
- `inspection_items` — Individual photo analysis dengan Gemini Vision
- `escrows` — Deposit escrow (hold, release, refund)
- `payments` — Payment transactions (Midtrans)
- `subscriptions` — Landlord premium (Free/Pro)
- `disputes` — Dispute cases dengan AI verdict
- `dispute_messages` — Mediation conversations
- `dispute_evidence` — Evidence files
- `reviews` — Two-way reputation rating
- `notifications` — Email/push notifications

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

- `modules/` → imports → `db/schema/`, `auth.ts`, `env.ts`, `services/`
- `services/` → imports → `db/schema/`
- ❌ `modules/A` → imports → `modules/B` (Gunakan shared service)

### Rule 8: The Database Connection Rule

**JANGAN** cache database connections sebagai singleton. Cloudflare Workers isolate freeze akan memutus TCP connections.

```typescript
// ✅ GOOD — Fresh client per request
export const getDb = (env: Env) => {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
  const client = new pg.Client({ connectionString });
  client.connect();
  return drizzle(client, { schema });
};

// ❌ BAD — Singleton pool akan hang setelah isolate freeze
const pool = new pg.Pool({ connectionString }); // JANGAN INI!
```

---

## 5. Directory Structure

```
src/
├── index.ts               # Entry point (export default app)
├── app.ts                 # Main app: mount middleware + semua module
├── auth.ts                # Better Auth config & cache
├── env.ts                 # Zod env schema & Env type (include HYPERDRIVE)
├── factory.ts             # createRouter(), AppEnv, AppContext
│
├── db/
│   ├── index.ts           # getDb(env) — fresh client per request
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
├── services/              # Cross-module business logic
│   ├── ai.service.ts      # Gemini/OpenRouter wrapper
│   ├── r2.service.ts      # Cloudflare R2 (upload, delete, URL)
│   ├── midtrans.service.ts # Payment & Escrow
│   └── notification.service.ts # Email/push notifications
│
└── scripts/
    └── generate-openapi.ts # bun openapi:generate
```

---

## 6. Development Workflow (Cara Tambah Fitur Baru)

### Phase 1: Data
1. Update `src/db/schema.ts` dengan tabel baru
2. `bun db:push` untuk sync ke DB

### Phase 2: Contract
3. Buat `src/modules/[domain]/[name].schema.ts` dengan Zod schemas
4. Buat `src/modules/[domain]/[name].routes.ts` dengan `createRoute()`

### Phase 3: Logic
5. Buat `src/modules/[domain]/[name].handlers.ts`
6. Buat `src/modules/[domain]/index.ts` pakai `createRouter()` + mount routes
7. Daftarkan module di `src/app.ts`

### Phase 4: Docs
8. `bun run openapi:generate` untuk update `openapi.json`

### Phase 5: Verify
9. `bun run fl` — Format & lint
10. `bun run check` — TypeScript type check

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
- ✅ Tidak ada cross-module imports (`modules/A` → `modules/B`)
- ✅ Database connections tidak di-cache sebagai singleton
- ✅ TypeScript strict mode (no `any`, proper type narrowing)
- ✅ Tidak ada unused imports atau variables

---

## 8. Dev-Only Routes

Route `/test/*` di `src/modules/dev/` **HANYA** untuk development. Sebelum production:
1. Hapus `import { devRouter }` dari `src/app.ts`
2. Hapus `app.route("/test", devRouter)` dari `src/app.ts`
3. Folder `src/modules/dev/` bisa dihapus

---

## 9. Current Endpoints Reference

| Method | Endpoint | Access | Status |
|---|---|---|---|
| `GET/POST` | `/api/auth/*` | Public | ✅ Better Auth (Google OAuth) |
| `GET` | `/api/me` | Authenticated | ⏳ TODO |
| `GET` | `/api/properties` | Public | ⏳ TODO |
| `GET` | `/api/properties/:id` | Public | ⏳ TODO |
| `POST` | `/api/properties` | Landlord | ⏳ TODO |
| `PATCH` | `/api/properties/:id` | Owner | ⏳ TODO |
| `DELETE` | `/api/properties/:id` | Owner | ⏳ TODO |
| `GET` | `/doc` | Public | ✅ OpenAPI JSON spec |
| `GET` | `/reference` | Public | ✅ Scalar UI (API docs) |

**Full endpoint list (50+ endpoints):** See `IMPLEMENTATION_PLAN.md` — Section "API Endpoints Summary"

---

## 10. Implementation Status

| Phase | Duration | Status | Fitur Utama |
|---|---|---|---|
| **Phase 1: Foundation** | Week 1-2 | 🔄 In Progress | Auth ✅, Properties ⏳, R2 Storage ⏳ |
| **Phase 2: Rental Lifecycle** | Week 3-4 | ⏳ Pending | Contracts, Bookings, AI Contract Gen |
| **Phase 3: AI Inspection** | Week 5-6 | ⏳ Pending | Gemini Vision, Damage Detection |
| **Phase 4: Escrow & Payments** | Week 7-8 | ⏳ Pending | Midtrans, Escrow, Subscriptions |
| **Phase 5: Dispute Resolution** | Week 9-10 | ⏳ Pending | AI Arbitration, Verdict System |
| **Phase 6: Dashboard & Polish** | Week 11-12 | ⏳ Pending | Dashboards, Reputation, Notifications |

**Detail lengkap:** `IMPLEMENTATION_PLAN.md`

---

## 11. Environment Variables

```env
# Database
DATABASE_URL=postgres://...
HYPERDRIVE_ID=84d544be300d480689904aeafba505f5

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Frontend
FRONTEND_URLS=https://app.rentsafe.ai

# AI
GEMINI_API_KEY=...
# ATAU
OPENROUTER_API_KEY=...

# Storage (R2)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_URL=...
R2_BUCKET_NAME=...

# Payment (Midtrans)
MIDTRANS_SERVER_KEY=...
MIDTRANS_CLIENT_KEY=...
MIDTRANS_ENVIRONMENT=sandbox

# Notifications (Resend)
RESEND_API_KEY=...

# General
NODE_ENV=production
```

---

**Last Updated:** 10 April 2026
**Maintained By:** Project team + AI assistants