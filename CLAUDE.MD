# CLAUDE.MD — AI Assistant Guide untuk RentSafe AI Backend

> **PENTING:** File ini adalah panduan untuk Claude AI yang bekerja di repository ini. SELALU baca dan ikuti guidelines ini.

---

## Project Context

**RentSafe AI** — Backend API untuk platform AI-powered dispute resolution sewa kos-kosan & apartemen di Indonesia.

**Problem:** 70-80% sengketa sewa terkait deposit. Biaya pengacara (IDR 5-15 juta) > nilai deposit (IDR 1-3 juta).

**Solution:**
1. AI Smart Contracts (KUHPerdata-compliant)
2. AI Property Inspection (Gemini Vision API)
3. Smart Escrow (Midtrans)
4. Automated Dispute Resolution (AI Arbitration)
5. Two-way Reputation System

**Dokumen Lengkap:**
- `Geost_RentSafeAI.md` — Product specification
- `IMPLEMENTATION_PLAN.md` — Phase-by-phase implementation guide
- `QWEN.MD` — Detailed AI assistant guide (lebih lengkap)

---

## TypeScript Safety Rules

- **Strictly avoid** `as any` or `: any` — use proper type casting, type narrowing, or `z.infer<typeof schema>`
- **Always validate** before accessing properties on destructured variables from Drizzle queries (`const [val] = await query` → check `if (!val)`)
- **Never leave unused** imported variables or defined variables — especially with Drizzle `.returning()` method
- **Use discriminated unions** for status fields instead of string literals when possible

---

## Cloudflare Workers Rules

- **NEVER** use `process.env` — always use `c.env` in handlers or pass env explicitly to services
- **NEVER** use `new Hono()` or `new OpenAPIHono()` directly — always use `createRouter()` from `src/factory.ts`
- **ALWAYS** document routes with `createRoute()` from `@hono/zod-openapi` — never use bare `router.get/post` for production routes
- **Use `z.string().datetime()`** for timestamp fields in OpenAPI schemas — **NEVER** `z.date()` (crashes OpenAPI generation)
- **NEVER cache database connections** as singletons — Cloudflare Workers isolate freeze will kill TCP connections → hangs forever → 500 errors
- **Create fresh database clients** per request — Hyperdrive handles connection pooling at the edge

---

## Project Architecture Rules

- **Check AGENTS.MD** — it's the authoritative guide for architecture, Golden Rules, and code patterns
- **Modular monolith** structure — `modules/[domain]/` for vertical slices, `services/` for cross-module logic
- **NO cross-module imports** — `modules/A` should NOT import from `modules/B` — use shared services instead
- **Services are pure** — do NOT pass Hono Context (`c`) to services — pass primitives (userId, data objects)
- **OpenAPI first** — every route must be documented with `createRoute` + Zod schemas
- **Follow implementation plan** — check `IMPLEMENTATION_PLAN.md` for current phase and priority

---

## Database & ORM Guidelines

- **Drizzle ORM** with PostgreSQL — all schemas in `src/db/schema.ts`
- **Use `getDb(env)`** from `src/db/index.ts` — creates fresh `pg.Client` (NOT pool) per request
- **Hyperdrive binding** — `env.HYPERDRIVE.connectionString` for production, fallback to `env.DATABASE_URL` for local dev
- **Better Auth tables** — `users`, `session`, `account`, `verification` — do NOT modify these manually
- **Custom tables** — `properties`, `bookings`, `contracts`, `inspections`, `escrows`, `disputes`, etc.

---

## Development Workflow

```bash
bun dev              # Start dev server (localhost:8000)
bun run fl           # Format & lint (oxfmt + oxlint)
bun run check        # TypeScript type check
bun db:push          # Sync schema to database
bun run openapi:generate  # Generate OpenAPI spec
wrangler deploy      # Deploy to Cloudflare Workers
wrangler tail        # Watch production logs
```

**Adding new feature:**
1. Update `src/db/schema.ts` → `bun db:push`
2. Create `[name].schema.ts` (Zod schemas)
3. Create `[name].routes.ts` (`createRoute` definitions)
4. Create `[name].handlers.ts` (Hono handlers)
5. Create `index.ts` (`createRouter()` + mount routes)
6. Register module in `src/app.ts`
7. `bun run openapi:generate`
8. `bun run fl && bun run check`

---

## External Services

| Service | Purpose | Status |
|---|---|---|
| **Google OAuth** | Authentication (Better Auth) | ✅ Setup |
| **Neon PostgreSQL** | Database | ✅ Setup |
| **Cloudflare Hyperdrive** | Connection pooling | ✅ Setup |
| **Cloudflare R2** | File storage (photos, contracts) | ⏳ Pending |
| **Google Gemini** | AI (Vision + Text) | ⏳ Pending |
| **Midtrans** | Payment & Escrow | ⏳ Phase 3 |
| **Resend** | Email notifications | ⏳ Phase 6 |

---

## Key Endpoints (Current)

| Method | Endpoint | Access | Status |
|---|---|---|---|
| `GET/POST` | `/api/auth/*` | Public | ✅ Better Auth |
| `GET` | `/api/me` | Authenticated | ⏳ TODO |
| `GET` | `/doc` | Public | ✅ OpenAPI JSON |
| `GET` | `/reference` | Public | ✅ Scalar UI |

**Full endpoint list:** See `IMPLEMENTATION_PLAN.md`

---

**Last Updated:** 10 April 2026