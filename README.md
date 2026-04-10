# RentSafe AI — Backend API

> **AI-powered platform untuk menyelesaikan sengketa sewa kos-kosan & apartemen di Indonesia.**
> Mengatasi "justice gap" di mana biaya hukum (IDR 5-15 juta) > nilai deposit (IDR 1-3 juta).

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)]()
[![Hono](https://img.shields.io/badge/Framework-Hono-black)]()
[![Cloudflare Workers](https://img.shields.io/badge/Runtime-Cloudflare%20Workers-orange)]()
[![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle-teal)]()

---

## 🎯 Problem & Solution

### The Problem

- **9.3 juta mahasiswa** di Indonesia, 50% tinggal di kos-kosan sewaan
- **IDR 4.6 Triliun** deposit beredar tanpa perlindungan
- **70-80% sengketa** terkait deposit yang tidak dikembalikan
- **Justice Gap:** Biaya pengacara (5-15 juta) > nilai deposit (1-3 juta)

### The Solution

1. **AI Smart Contracts** — Generate kontrak sewa KUHPerdata-compliant dalam 5 menit
2. **AI Property Inspection** — Gemini Vision API untuk dokumentasi kondisi properti
3. **Smart Escrow** — Deposit dipegang Midtrans, dirilis otomatis berdasarkan AI verdict
4. **Automated Dispute Resolution** — AI sebagai arbiter netral (95% lebih murah, 98% lebih cepat)
5. **Two-way Reputation System** — Rating untuk tenant & landlord

---

## 🛠️ Tech Stack

| Layer                  | Technology                                                             | Purpose                      |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| **Runtime**            | Cloudflare Workers                                                     | Serverless edge computing    |
| **Framework**          | [Hono](https://hono.dev) v4+                                           | Lightweight web framework    |
| **OpenAPI**            | `@hono/zod-openapi`                                                    | Route documentation          |
| **Auth**               | [Better Auth](https://www.better-auth.com)                             | Google OAuth                 |
| **Database**           | [Neon](https://neon.tech) PostgreSQL                                   | Serverless Postgres          |
| **Connection Pooling** | [Cloudflare Hyperdrive](https://developers.cloudflare.com/hyperdrive/) | Edge connection pooling      |
| **ORM**                | [Drizzle ORM](https://orm.drizzle.team)                                | Type-safe queries            |
| **Storage**            | Cloudflare R2                                                          | S3-compatible file storage   |
| **AI**                 | Google Gemini / OpenRouter                                             | Vision API + text generation |
| **Payment**            | [Midtrans](https://midtrans.com)                                       | Escrow & subscription        |
| **Validation**         | [Zod](https://zod.dev)                                                 | Request/response validation  |
| **Language**           | TypeScript (strict)                                                    | Type safety                  |
| **Linting**            | Oxlint & Oxfmt                                                         | Fast lint & format           |

---

## 📚 Documentation

| Document                                               | Purpose                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| **[QWEN.MD](./QWEN.MD)**                               | 🤖 AI Assistant Guide (lengkap dengan service guidelines)       |
| **[CLAUDE.MD](./CLAUDE.MD)**                           | 🤖 AI Assistant Guide (ringkasan rules & workflow)              |
| **[AGENTS.MD](./AGENTS.MD)**                           | 📐 Architecture rules & Golden Rules (WAJIB dibaca)             |
| **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** | 🗺️ Phase-by-phase implementation plan (50+ endpoints)           |
| **[Geost_RentSafeAI.md](./Geost_RentSafeAI.md)**       | 📄 Product specification (background, solution, business model) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           FRONTEND (Vercel)                 │
│  Next.js + React + Tailwind + Vercel AI SDK │
│  ↓ AI calls → Gemini/OpenRouter             │
│  ↓ API calls → Backend                      │
└──────────────┬──────────────────────────────┘
               │ REST API (CORS enabled)
               ↓
┌─────────────────────────────────────────────┐
│         BACKEND (Cloudflare Workers)        │
│  Hono + Better Auth + Hyperdrive            │
│  ↓ Database → Neon PostgreSQL               │
│  ↓ Storage → Cloudflare R2                  │
│  ↓ Payment → Midtrans                       │
│  ↓ AI → Gemini / OpenRouter                 │
└─────────────────────────────────────────────┘
```

### Module Structure

```
src/
├── modules/
│   ├── auth/              # Better Auth (Google OAuth)
│   ├── users/             # User management
│   ├── properties/        # Property CRUD
│   ├── bookings/          # Booking management
│   ├── contracts/         # AI smart contracts
│   ├── inspections/       # AI property inspection
│   ├── escrows/           # Deposit escrow
│   ├── payments/          # Payment processing
│   ├── disputes/          # Dispute resolution
│   ├── subscriptions/     # Landlord premium
│   └── dashboard/         # User analytics
├── services/
│   ├── ai.service.ts      # Gemini/OpenRouter wrapper
│   ├── r2.service.ts      # Cloudflare R2 storage
│   ├── midtrans.service.ts # Payment & Escrow
│   └── notification.service.ts # Email notifications
├── db/
│   ├── index.ts           # getDb(env) — fresh client per request
│   └── schema.ts          # All Drizzle schemas
└── middlewares/
    └── cors.ts            # CORS configuration
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.0+
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- PostgreSQL database (Neon recommended)
- Cloudflare Hyperdrive setup

### 1. Clone & Install

```bash
bun install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` dan isi dengan credentials Anda (lihat [Environment Variables](#-environment-variables)).

### 3. Setup Database

```bash
bun db:push          # Sync schema ke database
```

### 4. Start Development Server

```bash
bun dev              # Runs on http://localhost:8000
```

### 5. View API Documentation

- **OpenAPI JSON:** http://localhost:8000/doc
- **Scalar UI:** http://localhost:8000/reference

---

## 📝 Database Commands

```bash
bun db:push          # Sync schema to database (development)
bun db:generate      # Generate migration files
bun db:migrate       # Apply migrations (production)
bun db:studio        # Open Drizzle Studio (GUI)
```

---

## 🔧 Development Commands

```bash
bun dev              # Start dev server with hot reload
bun run fl           # Format & lint (oxfmt + oxlint)
bun run check        # TypeScript type check (tsc --noEmit)
bun run openapi:generate  # Generate OpenAPI spec
```

### Adding New Features

1. Update `src/db/schema.ts` → `bun db:push`
2. Create `[name].schema.ts` (Zod schemas)
3. Create `[name].routes.ts` (`createRoute` definitions)
4. Create `[name].handlers.ts` (Hono handlers)
5. Create `index.ts` (`createRouter()` + mount routes)
6. Register module in `src/app.ts`
7. `bun run openapi:generate`
8. `bun run fl && bun run check`

---

## 🌍 Environment Variables

| Variable               | Description                  | Required | Example                           |
| ---------------------- | ---------------------------- | -------- | --------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string | ✅       | `postgres://user:pass@host/db`    |
| `BETTER_AUTH_SECRET`   | Secret key (min 32 chars)    | ✅       | `your-secret-key-min-32-chars...` |
| `BETTER_AUTH_URL`      | Base URL for auth            | ✅       | `https://api.rentsafe.ai`         |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID       | ✅       | `xxx.apps.googleusercontent.com`  |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret   | ✅       | `GOCSPX-xxx`                      |
| `FRONTEND_URLS`        | Allowed frontend URLs        | ✅       | `https://app.rentsafe.ai`         |
| `GEMINI_API_KEY`       | Google AI Studio key         | ⏳       | `AIzaSy...`                       |
| `OPENROUTER_API_KEY`   | Alternative AI provider      | ⏳       | `sk-or-...`                       |
| `R2_ACCOUNT_ID`        | Cloudflare R2 account        | ⏳       | `xxx`                             |
| `R2_ACCESS_KEY_ID`     | R2 access key                | ⏳       | `xxx`                             |
| `R2_SECRET_ACCESS_KEY` | R2 secret key                | ⏳       | `xxx`                             |
| `R2_PUBLIC_URL`        | R2 public URL                | ⏳       | `https://r2.pub...`               |
| `R2_BUCKET_NAME`       | R2 bucket name               | ⏳       | `rentsafe-assets`                 |
| `MIDTRANS_SERVER_KEY`  | Midtrans server key          | ⏳       | `SB-Mid-server-xxx`               |
| `MIDTRANS_CLIENT_KEY`  | Midtrans client key          | ⏳       | `SB-Mid-client-xxx`               |
| `MIDTRANS_ENVIRONMENT` | Midtrans environment         | ⏳       | `sandbox` or `production`         |
| `RESEND_API_KEY`       | Resend email API key         | ⏳       | `re_xxx`                          |
| `NODE_ENV`             | Environment                  | ❌       | `development` or `production`     |

---

## 📊 Implementation Status

| Phase                           | Status         | Features                        |
| ------------------------------- | -------------- | ------------------------------- |
| **Phase 1: Foundation**         | 🔄 In Progress | Auth ✅, Properties ⏳, R2 ⏳   |
| **Phase 2: Rental Lifecycle**   | ⏳ Pending     | Contracts, Bookings             |
| **Phase 3: AI Inspection**      | ⏳ Pending     | Gemini Vision, Damage Detection |
| **Phase 4: Escrow & Payments**  | ⏳ Pending     | Midtrans, Escrow                |
| **Phase 5: Dispute Resolution** | ⏳ Pending     | AI Arbitration                  |
| **Phase 6: Dashboard & Polish** | ⏳ Pending     | Analytics, Notifications        |

**Detail lengkap:** [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

---

## 🚀 Deployment

### Cloudflare Workers

```bash
wrangler deploy          # Deploy to production
wrangler tail            # Watch production logs
wrangler deploy --dry-run  # Test deployment without deploying
```

### CI/CD

- GitHub Actions workflow otomatis untuk lint, format, typecheck
- Deploy manual via `wrangler deploy` (tidak auto-deploy untuk menghindari double deployment)

---

## 📖 API Endpoints

| Module            | Endpoints                 | Status                        |
| ----------------- | ------------------------- | ----------------------------- |
| **Auth**          | `/api/auth/*`             | ✅ Better Auth (Google OAuth) |
| **Users**         | `/api/me`, `/api/users/*` | ⏳ TODO                       |
| **Properties**    | `/api/properties`         | ⏳ TODO                       |
| **Bookings**      | `/api/bookings`           | ⏳ TODO                       |
| **Contracts**     | `/api/contracts`          | ⏳ TODO                       |
| **Inspections**   | `/api/inspections`        | ⏳ TODO                       |
| **Escrows**       | `/api/escrows`            | ⏳ TODO                       |
| **Payments**      | `/api/payments`           | ⏳ TODO                       |
| **Disputes**      | `/api/disputes`           | ⏳ TODO                       |
| **Subscriptions** | `/api/subscriptions`      | ⏳ TODO                       |
| **Dashboard**     | `/api/dashboard/*`        | ⏳ TODO                       |

**Total:** ~50 endpoints planned. **Full list:** [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md#-api-endpoints-summary)

---

## 🤝 Contributing

1. Baca [AGENTS.MD](./AGENTS.MD) untuk architecture rules
2. Baca [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) untuk current priorities
3. Ikuti Golden Rules (terutama: `createRouter()`, OpenAPI docs, no singletons)
4. Run `bun run fl && bun run check` sebelum commit
5. Buat pull request dengan deskripsi jelas

---

## 📄 License

Proprietary — RentSafe AI © 2026

---

**Built with:** Hono · Cloudflare Workers · Drizzle ORM · Better Auth · Neon PostgreSQL · Hyperdrive
