# GEMINI.MD — AI Assistant Guide untuk RentSafe AI

> **PENTING:** File ini adalah panduan personalisasi untuk GEMINI CLI (AI assistant) yang bekerja di repository ini. SELALU baca dan ikuti panduan ini sebelum memulai pekerjaan.

---

## 1. Project Context

**Nama Proyek:** RentSafe AI — Backend API
**Deskripsi:** Platform AI-powered untuk menyelesaikan sengketa sewa kos-kosan & apartemen di Indonesia. Mengatasi "justice gap" di mana biaya hukum (IDR 5-15 juta) > nilai deposit (IDR 1-3 juta).

**Solusi Utama:**
1. **AI Smart Contracts** — Generate kontrak sewa KUHPerdata-compliant dalam 5 menit
2. **AI Property Inspection** — Gemini Vision API untuk dokumentasi kondisi properti (check-in/check-out)
3. **Smart Escrow** — Deposit dipegang Midtrans, dirilis otomatis berdasarkan AI verdict
4. **Automated Dispute Resolution** — AI sebagai arbiter netral (95% lebih murah, 98% lebih cepat)
5. **Two-way Reputation System** — Rating untuk tenant & landlord

**Target Users:**
- **Tenants:** Mahasiswa & young professionals (9.3 juta mahasiswa di Indonesia)
- **Landlords:** Pemilik kos-kosan & apartemen
- **Admin:** Platform moderator

**Dokumen Referensi:**
- `Geost_RentSafeAI.md` — Dokumen lengkap (background, solution, architecture, business model)
- `IMPLEMENTATION_PLAN.md` — Phase-by-phase implementation plan

---

## 2. Tech Stack (Strict)

| Layer | Technology | Keterangan |
|---|---|---|
| **Runtime** | Cloudflare Workers | Bukan Node.js/Bun. Env via `c.env` |
| **Framework** | Hono v4+ | Lightweight web framework |
| **OpenAPI** | `@hono/zod-openapi` | Route documentation dengan `createRoute` |
| **Auth** | Better Auth | Google OAuth (bukan Supabase) |
| **Database** | Neon PostgreSQL | Serverless Postgres |
| **Connection Pooling** | Cloudflare Hyperdrive | Binding: `env.HYPERDRIVE` |
| **ORM** | Drizzle ORM | Type-safe query |
| **Storage** | Cloudflare R2 | S3-compatible untuk foto inspection & contracts |
| **AI** | Google Gemini / OpenRouter | Vision API + text generation |
| **Payment** | Midtrans | Escrow & subscription |
| **Validation** | Zod | Request/response validation |
| **Language** | TypeScript (strict) | No `any`, no `process.env` |
| **Linting** | Oxlint & Oxfmt | Fast lint & format |

> ⚠️ **Cloudflare Workers** bukan Node.js/Bun. Environment variables diakses via `c.env`, **bukan** `process.env`. Database connections TIDAK BOLEH di-cache sebagai singleton (isolate freeze akan memutus TCP).

---

## 3. Architecture Rules

### 3.1 Struktur: Modular Monolith

```
src/
├── modules/          # Vertical slices (auth, properties, contracts, dll)
├── services/         # Cross-module logic (ai, r2, midtrans, notification)
├── db/
│   ├── index.ts      # getDb(env) — SELALU buat client baru, JANGAN cache pool
│   └── schema.ts     # Semua Drizzle schema di sini
├── middlewares/      # CORS, auth guards, rate limiting
├── factory.ts        # createRouter() — JANGAN new Hono() langsung
├── auth.ts           # Better Auth config
└── env.ts            # Zod env schema + Env type
```

### 3.2 Golden Rules (WAJIB, pelanggaran = immediate rejection)

1. ✅ **SELALU** pakai `createRouter()` dari `src/factory.ts` — JANGAN `new Hono()` langsung
2. ✅ **SELALU** pakai `createRoute` + `router.openapi()` untuk dokumentasi
3. ✅ **SELALU** validasi request dengan Zod di `createRoute` schema
4. ✅ **JANGAN** pass Hono Context (`c`) ke Services — pass primitives
5. ✅ **JANGAN** pakai `process.env` — pakai `c.env`
6. ✅ **JANGAN** pakai `z.date()` di OpenAPI schema — pakai `z.string().datetime()`
7. ✅ **JANGAN** import `modules/A` → `modules/B` — pakai shared service
8. ✅ **JANGAN** cache database connections sebagai singleton — buat client baru per request

### 3.3 Development Workflow (Tambah Fitur Baru)

```
Phase 1: Data   → Update src/db/schema.ts → bun run db:push
Phase 2: Contract → Buat [name].schema.ts → [name].routes.ts
Phase 3: Logic  → Buat [name].handlers.ts → index.ts (createRouter + mount)
Phase 4: Register → Daftarkan module di src/app.ts
Phase 5: Docs   → bun run openapi:generate
Phase 6: Verify → bun run fl && bun run check
```

---

## 4. Current Status & Implementation Plan

### Phase 1: Foundation (Week 1-2) — SEDANG DIKERJAKAN
- [x] Better Auth + Google OAuth
- [x] User schema dengan role (tenant/landlord/admin)
- [x] Hyperdrive binding setup
- [ ] Property CRUD endpoints
- [ ] R2 Bucket integration (upload, delete, presign)

### Phase 2: Rental Lifecycle (Week 3-4)
- [ ] Booking management (accept, reject, cancel)
- [ ] Smart Contract generation (AI)
- [ ] Contract signing workflow

### Phase 3: AI Property Inspection (Week 5-6)
- [ ] Inspection schema (check-in/check-out)
- [ ] Gemini Vision API integration
- [ ] Damage detection & severity scoring
- [ ] Check-in vs Check-out comparison

### Phase 4: Escrow & Payments (Week 7-8)
- [ ] Midtrans integration
- [ ] Escrow lifecycle (create, hold, release, refund)
- [ ] Landlord subscription (Free/Pro)

### Phase 5: Dispute Resolution (Week 9-10)
- [ ] Dispute creation & evidence management
- [ ] AI arbitration (multi-round mediation)
- [ ] Verdict system & auto escrow release

### Phase 6: Dashboard & Polish (Week 11-12)
- [ ] Tenant & Landlord dashboard endpoints
- [ ] Reputation system (two-way rating)
- [ ] Notifications (email reminders)
- [ ] Performance optimization & audit logging

**Lihat detail lengkap di:** `IMPLEMENTATION_PLAN.md`

---

## 5. Database Schema (High-Level)

**Tables yang sudah ada:**
- `users` — User dengan role (tenant/landlord/admin)
- `properties` — Data properti/kos
- `bookings` — Booking requests
- `session`, `account`, `verification` — Better Auth tables

**Tables yang akan ditambahkan:**
- `contracts` — Smart contracts (AI-generated)
- `inspections` — Property inspection reports
- `inspection_items` — Individual photo analysis
- `escrows` — Deposit escrow
- `payments` — Payment transactions
- `subscriptions` — Landlord premium
- `disputes` — Dispute cases
- `dispute_messages` — Mediation conversations
- `dispute_evidence` — Evidence files
- `reviews` — Two-way reputation
- `notifications` — Email/push notifications

---

## 6. Environment Variables (Final)

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

## 7. AI Service Guidelines

### 7.1 Gemini Vision API (Property Inspection)
- **Model:** `gemini-2.0-flash`
- **Input:** Foto properti (base64 atau URL)
- **Output:** JSON dengan detected damages, severity score, estimated repair cost
- **Prompt Strategy:** System prompt dengan KUHPerdata context + damage taxonomy

### 7.2 Gemini Text API (Contract Generation)
- **Model:** `gemini-2.0-flash`
- **Input:** Property details + user data + terms
- **Output:** KUHPerdata-compliant contract text
- **Additional:** Fairness scoring, plain language summary

### 7.3 AI Dispute Resolution
- **Input:** Contract, inspection reports, messages, evidence
- **Output:** Verdict dengan justification, confidence score, cost calculation
- **Process:** Multi-round mediation (bisa submit counterarguments)

---

## 8. Code Quality Checklist

Sebelum commit, WAJIB jalankan:

```bash
bun run fl     # Format & lint (oxfmt + oxlint)
bun run check  # TypeScript type check (tsc --noEmit)
```

**Pre-commit Checklist:**
- ✅ Tidak ada `new Hono()` / `new OpenAPIHono()` di module (gunakan `createRouter()`)
- ✅ Tidak ada `process.env` (gunakan `c.env`)
- ✅ Semua route pakai `createRoute` + `router.openapi()`
- ✅ Tidak ada `z.date()` di OpenAPI schema (gunakan `z.string().datetime()`)
- ✅ Services tidak menerima Hono Context
- ✅ Tidak ada cross-module imports (`modules/A` → `modules/B`)
- ✅ Database connections tidak di-cache sebagai singleton
- ✅ TypeScript strict mode (no `any`, proper type narrowing)

---

## 9. Important Notes

### 9.1 Cloudflare Workers Isolation Model
- Setiap request berjalan di **isolate terpisah**
- Isolate bisa **freeze** saat idle → TCP connections mati
- **JANGAN** cache database connections, AI clients, atau I/O objects
- **SELALU** buat fresh connection per request (Hyperdrive handle pooling di edge)

### 9.2 CORS & Frontend Communication
- Frontend: Next.js di Vercel (`https://app.rentsafe.ai`)
- Backend: Hono di Cloudflare Workers
- CORS middleware sudah setup di `src/middleware/cors.ts`
- Cookies (Better Auth) dikirim dengan `credentials: include`

### 9.3 Dev-Only Routes
- Route `/test/*` di `src/modules/dev/` **HANYA** untuk development
- Sebelum production: hapus dari `src/app.ts` dan hapus folder `src/modules/dev/`

### 9.4 OpenAPI Documentation
- Generate: `bun run openapi:generate`
- View: `GET /doc` (JSON spec), `GET /reference` (Scalar UI)
- Semua endpoint WAJIB terdokumentasi

---

## 10. Quick Reference

### Useful Commands
```bash
bun dev              # Start dev server
bun run fl           # Format & lint
bun run check        # TypeScript type check
bun db:push          # Sync schema ke database
bun run openapi:generate  # Generate OpenAPI spec
wrangler deploy      # Deploy to production
wrangler tail        # Watch logs
```

### External Services
- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Neon Console:** https://console.neon.tech
- **Google AI Studio:** https://aistudio.google.com
- **Midtrans Sandbox:** https://dashboard.sandbox.midtrans.com
- **Resend:** https://resend.com

---

## 11. When in Doubt

1. **Cek AGENTS.MD** — Architecture rules & golden rules
2. **Cek IMPLEMENTATION_PLAN.md** — Fitur apa yang sedang dikerjakan
3. **Cek existing modules** — Ikuti pattern yang sudah ada
4. **Tanya user** — Jika ambiguous atau di luar scope plan

---

**Last Updated:** 10 April 2026
**Maintained By:** GEMINI CLI (AI Assistant)
