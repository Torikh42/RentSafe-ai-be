# 🚀 RentSafe AI — Backend Implementation Plan

> **Stack:** Hono + Cloudflare Workers + Better Auth (Google OAuth) + Drizzle ORM + Neon PostgreSQL + Cloudflare Hyperdrive + R2 Bucket
> **Dokumen Referensi:** `Geost_RentSafeAI.md`
> **Last Updated:** 10 April 2026

---

## 📋 Daftar Fitur (Berdasarkan Dokumen)

| # | Fitur | Status | Priority |
|---|---|---|---|
| 1 | **Authentication & Authorization** (Google OAuth, Role-based) | ✅ Sebagian ada | P0 |
| 2 | **Property Management** (CRUD, AI Inspection) | ✅ Sebagian ada | P0 |
| 3 | **Smart Contract Generation** (AI-powered) | ❌ Belum ada | P0 |
| 4 | **Booking & Rental Lifecycle** | ✅ Sebagian ada | P0 |
| 5 | **Escrow System** (Midtrans Integration) | ❌ Belum ada | P1 |
| 6 | **AI Property Inspection** (Gemini Vision API) | ❌ Belum ada | P0 |
| 7 | **Dispute Resolution** (AI Arbitration) | ❌ Belum ada | P1 |
| 8 | **File Storage** (R2 for photos, contracts) | ❌ Belum ada | P0 |
| 9 | **User Dashboard & Analytics** | ❌ Belum ada | P2 |
| 10 | **Notifications & Reminders** | ❌ Belum ada | P2 |
| 11 | **Reputation System** (Two-way rating) | ❌ Belum ada | P2 |

---

## 🗺️ Phase-by-Phase Implementation

### **PHASE 1: Foundation & Core (Week 1-2)**
**Goal:** Authentication, User Management, Property CRUD, File Storage

#### **1.1 Authentication & Authorization** ✅ Setup Dasar
**Files:**
- `src/modules/auth/` (sudah ada)
- `src/db/schema.ts` → `users`, `session`, `account`, `verification` (sudah ada)

**Tasks:**
- [x] Setup Better Auth dengan Google OAuth
- [ ] Tambah field `role` (tenant/landlord/admin) ke Better Auth user creation
- [ ] Setup middleware `requireRole()` untuk role-based access
- [ ] Endpoint: `GET /api/me` — get current user with role
- [ ] Endpoint: `PATCH /api/users/me` — update profile, role selection

**Dependencies:** Sudah lengkap

---

#### **1.2 Property Management** 🏠
**Files:**
- `src/modules/properties/`
- `src/db/schema.ts` → `properties` (sudah ada)

**Current Schema:**
```typescript
properties: id, name, address, price, description, available, landlordId, createdAt, updatedAt
```

**Tasks:**
- [ ] Endpoint: `GET /api/properties` — list all (with pagination)
- [ ] Endpoint: `GET /api/properties/:id` — detail
- [ ] Endpoint: `POST /api/properties` — create (landlord only)
- [ ] Endpoint: `PATCH /api/properties/:id` — update (owner only)
- [ ] Endpoint: `DELETE /api/properties/:id` — delete (owner only)
- [ ] Endpoint: `GET /api/properties/my` — list landlord's properties
- [ ] Tambah field ke schema: `rooms` (integer), `type` (kos/apartment), `facilities` (text[]), `images` (text[])

**Dependencies:** Auth module (1.1)

---

#### **1.3 File Storage — R2 Bucket** 📦
**Files:**
- `src/services/r2.service.ts` (baru)
- `src/modules/uploads/` (baru)

**Tasks:**
- [ ] Setup R2 binding di `wrangler.toml`
- [ ] Create `r2.service.ts` — upload, delete, get signed URL
- [ ] Endpoint: `POST /api/uploads/presign` — get presigned URL untuk upload
- [ ] Endpoint: `POST /api/uploads/multipart` — multipart upload (untuk foto besar)
- [ ] Endpoint: `DELETE /api/uploads/:key` — delete file (owner only)
- [ ] Endpoint: `GET /api/uploads/:key/url` — get public URL
- [ ] Setup folder structure: `/{userId}/{propertyId}/{timestamp}-{filename}`
- [ ] Validasi file type (hanya images: jpg, png, webp)
- [ ] Validasi file size (max 10MB per file)

**Dependencies:** Cloudflare R2 bucket creation di dashboard

---

### **PHASE 2: Rental Lifecycle (Week 3-4)**
**Goal:** Booking → Contract → Escrow → Move-in/Move-out

#### **2.1 Booking & Rental Agreement** 📝
**Files:**
- `src/modules/bookings/` (sudah ada, perlu diperluas)
- `src/db/schema.ts` → `bookings`, `contracts` (baru)

**Schema Additions:**
```typescript
contracts: {
  id, propertyId, tenantId, landlordId,
  startDate, endDate, depositAmount, monthlyRent,
  contractText (text), fairnessScore (integer),
  status: 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated',
  signedByTenant (boolean), signedByLandlord (boolean),
  signedAt (timestamp), expiresAt (timestamp),
  createdAt, updatedAt
}
```

**Tasks:**
- [ ] Endpoint: `POST /api/bookings/:id/accept` — landlord accept booking
- [ ] Endpoint: `POST /api/bookings/:id/reject` — landlord reject booking
- [ ] Endpoint: `POST /api/bookings/:id/cancel` — tenant cancel
- [ ] Endpoint: `GET /api/bookings/my` — list user's bookings (tenant & landlord view)
- [ ] Setup contract schema
- [ ] Endpoint: `POST /api/contracts/generate` — trigger AI contract generation
- [ ] Endpoint: `GET /api/contracts/:id` — get contract detail
- [ ] Endpoint: `POST /api/contracts/:id/sign` — sign contract (both parties)

**Dependencies:** Property (1.2), Auth (1.1)

---

#### **2.2 Smart Contract Generation — AI** 🤖
**Files:**
- `src/services/ai.service.ts` (baru)
- `src/modules/contracts/` (baru)

**AI Integration:**
- Provider: Google Gemini API / OpenRouter
- Model: Gemini 2.0 Flash (untuk teks generation)
- Prompt: Generate KUHPerdata-compliant contract berdasarkan property details

**Tasks:**
- [ ] Setup AI service (`ai.service.ts`) — wrapper untuk Gemini/OpenRouter
- [ ] Create contract template system (dengan placeholders)
- [ ] Implement `generateContract()` — call AI dengan property + user data
- [ ] Implement `analyzeFairness()` — AI score contract fairness
- [ ] Implement `summarizeContract()` — AI generate plain language summary
- [ ] Endpoint: `POST /api/contracts/:id/regenerate` — regenerate with new terms
- [ ] Endpoint: `GET /api/contracts/:id/fairness` — get fairness score & explanation

**Dependencies:** Contract schema (2.1), AI API key

---

#### **2.3 AI Property Inspection — Gemini Vision** 📸
**Files:**
- `src/modules/inspections/` (baru)
- `src/db/schema.ts` → `inspections`, `inspection_items` (baru)

**Schema Additions:**
```typescript
inspections: {
  id, contractId, propertyId,
  type: 'check_in' | 'check_out',
  status: 'pending' | 'analyzing' | 'completed' | 'failed',
  totalPhotos (integer),
  aiReport (json), // AI-generated report
  damages (json), // Array of detected damages
  createdAt, completedAt
}

inspection_items: {
  id, inspectionId,
  photoUrl (text),
  roomType (text), // bedroom, bathroom, kitchen, etc
  description (text),
  condition: 'good' | 'minor_damage' | 'major_damage',
  severityScore (integer), // 0-100
  estimatedRepairCost (integer),
  aiNotes (text),
  createdAt
}
```

**Tasks:**
- [ ] Setup inspection schema
- [ ] Endpoint: `POST /api/inspections` — create inspection (auto saat contract signed)
- [ ] Endpoint: `POST /api/inspections/:id/photos` — upload photo (ke R2)
- [ ] Endpoint: `GET /api/inspections/:id` — get inspection status & results
- [ ] Endpoint: `POST /api/inspections/:id/analyze` — trigger AI analysis
- [ ] Implement `analyzePhoto()` — Gemini Vision API call
  - Detect damage (scratches, stains, cracks, etc)
  - Assign severity score
  - Estimate repair cost
  - Generate description
- [ ] Implement `generateInspectionReport()` — compile all photos into report
- [ ] Endpoint: `POST /api/inspections/:id/compare` — compare check-in vs check-out
  - AI side-by-side analysis
  - Identify new damages vs pre-existing
  - Distinguish normal wear vs actual damage
  - Calculate deduction recommendations

**Dependencies:** R2 storage (1.3), Contract (2.1), AI service (2.2)

---

### **PHASE 3: Escrow & Payments (Week 5-6)**
**Goal:** Midtrans Integration, Escrow Management, Auto-disbursement

#### **3.1 Payment & Escrow System** 💰
**Files:**
- `src/modules/payments/` (baru)
- `src/services/midtrans.service.ts` (baru)
- `src/db/schema.ts` → `payments`, `escrows` (baru)

**Schema Additions:**
```typescript
escrows: {
  id, contractId,
  amount (integer), // deposit amount
  fee (integer), // 2.5% platform fee
  status: 'pending' | 'held' | 'disbursing' | 'released' | 'refunded',
  midtransOrderId (text),
  paymentUrl (text),
  releasedAt (timestamp),
  releasedTo (text), // 'tenant' or 'landlord'
  releaseReason (text),
  createdAt, updatedAt
}

payments: {
  id, escrowId,
  type: 'deposit' | 'rent' | 'refund' | 'deduction',
  amount (integer),
  status: 'pending' | 'success' | 'failed',
  midtransTransactionId (text),
  paymentMethod (text),
  paidAt (timestamp),
  createdAt
}
```

**Tasks:**
- [ ] Setup Midtrans API integration (`midtrans.service.ts`)
  - Create payment request
  - Handle webhook notifications
  - Disbursement API (untuk release escrow)
- [ ] Setup escrow schema
- [ ] Endpoint: `POST /api/escrows` — create escrow (saat contract signed)
- [ ] Endpoint: `GET /api/escrows/:id` — get escrow status
- [ ] Endpoint: `POST /api/escrows/:id/pay` — initiate payment (get Midtrans payment URL)
- [ ] Endpoint: `POST /api/webhooks/midtrans` — handle Midtrans payment callbacks
- [ ] Implement `releaseEscrow()` — auto-disburse berdasarkan AI verdict
- [ ] Implement `refundEscrow()` — refund ke tenant jika tidak ada damage
- [ ] Implement `deductEscrow()` — deduct untuk landlord jika ada damage
- [ ] Endpoint: `GET /api/payments/my` — list user's payments

**Dependencies:** Contract (2.1), Midtrans API credentials

---

#### **3.2 Landlord Subscription System** 💳
**Files:**
- `src/modules/subscriptions/` (baru)
- `src/db/schema.ts` → `subscriptions` (baru)

**Schema Additions:**
```typescript
subscriptions: {
  id, userId,
  plan: 'free' | 'pro',
  status: 'active' | 'cancelled' | 'expired',
  startedAt, expiresAt,
  midtransSubscriptionId (text),
  createdAt, updatedAt
}
```

**Tasks:**
- [ ] Setup subscription schema
- [ ] Implement middleware `requireSubscription()` — check if landlord can access premium features
- [ ] Endpoint: `POST /api/subscriptions/upgrade` — upgrade to Pro (IDR 49,000/month)
- [ ] Endpoint: `GET /api/subscriptions/me` — get current subscription
- [ ] Endpoint: `POST /api/subscriptions/cancel` — cancel subscription
- [ ] Endpoint: `POST /api/webhooks/midtrans/subscription` — handle subscription payment
- [ ] Implement feature gating:
  - Free: max 2 properties
  - Pro: unlimited properties, verified badge, bulk management

**Dependencies:** Midtrans subscription API, User (1.1)

---

### **PHASE 4: Dispute Resolution (Week 7-8)**
**Goal:** AI Arbitration, Evidence Management, Verdict System

#### **4.1 Dispute Management** ⚖️
**Files:**
- `src/modules/disputes/` (baru)
- `src/db/schema.ts` → `disputes`, `dispute_messages`, `dispute_evidence` (baru)

**Schema Additions:**
```typescript
disputes: {
  id, contractId, inspectionId,
  initiatedBy (text), // userId
  status: 'open' | 'mediating' | 'verdict_given' | 'accepted' | 'escalated' | 'closed',
  aiVerdict (json),
  aiVerdictReason (text),
  confidenceScore (integer), // 0-100
  acceptedByTenant (boolean),
  acceptedByLandlord (boolean),
  escalatedAt (timestamp),
  resolvedAt (timestamp),
  createdAt, updatedAt
}

dispute_messages: {
  id, disputeId,
  userId,
  message (text),
  attachments (text[]), // URLs
  createdAt
}

dispute_evidence: {
  id, disputeId,
  submittedBy (text), // userId
  evidenceType: 'photo' | 'document' | 'message',
  url (text),
  description (text),
  createdAt
}
```

**Tasks:**
- [ ] Setup dispute schema
- [ ] Endpoint: `POST /api/disputes` — create dispute (from inspection mismatch)
- [ ] Endpoint: `GET /api/disputes/:id` — get dispute detail (with all messages & evidence)
- [ ] Endpoint: `POST /api/disputes/:id/message` — submit message/argument
- [ ] Endpoint: `POST /api/disputes/:id/evidence` — upload evidence
- [ ] Endpoint: `POST /api/disputes/:id/mediate` — trigger AI mediation
- [ ] Implement `generateVerdict()` — AI analyze semua evidence:
  - Retrieve contract terms
  - Compare check-in vs check-out photos
  - Analyze message history
  - Reference legal precedents
  - Calculate fair deduction
  - Generate detailed justification
- [ ] Endpoint: `POST /api/disputes/:id/accept` — accept verdict (both parties)
- [ ] Endpoint: `POST /api/disputes/:id/reject` — reject verdict → escalate
- [ ] Implement `autoReleaseEscrow()` — trigger escrow release setelah verdict accepted

**Dependencies:** Inspection (2.3), Escrow (3.1), AI service (2.2)

---

### **PHASE 5: Dashboard & Analytics (Week 9-10)**
**Goal:** User Dashboard, Property Analytics, Reputation System

#### **5.1 User Dashboard & Analytics** 📊
**Files:**
- `src/modules/dashboard/` (baru)

**Tasks:**
- [ ] Endpoint: `GET /api/dashboard/tenant` — tenant dashboard data
  - Active contracts
  - Upcoming payments
  - Inspection status
  - Dispute status
- [ ] Endpoint: `GET /api/dashboard/landlord` — landlord dashboard data
  - Property overview
  - Occupancy rate
  - Revenue summary
  - Pending approvals
  - Subscription status
- [ ] Endpoint: `GET /api/dashboard/analytics/property/:id` — property-specific analytics
  - Occupancy history
  - Revenue trends
  - Inspection history
  - Tenant turnover

**Dependencies:** Semua module sebelumnya

---

#### **5.2 Reputation System** ⭐
**Files:**
- `src/db/schema.ts` → `reviews` (baru)

**Schema Additions:**
```typescript
reviews: {
  id, contractId,
  reviewerId (text), // userId
  revieweeId (text), // userId
  rating (integer), // 1-5
  comment (text),
  createdAt
}
```

**Tasks:**
- [ ] Setup review schema
- [ ] Endpoint: `POST /api/reviews` — submit review (after contract ends)
- [ ] Endpoint: `GET /api/users/:id/reputation` — get user's reputation score
- [ ] Endpoint: `GET /api/users/:id/reviews` — list user's reviews
- [ ] Implement `calculateReputation()` — aggregate ratings, weighted average
- [ ] Add reputation score ke `GET /api/users/:id` response

**Dependencies:** Contract (2.1), User (1.1)

---

### **PHASE 6: Notifications & Polish (Week 11-12)**
**Goal:** Email Notifications, Reminders, Bug Fixes, Performance

#### **6.1 Notification System** 🔔
**Files:**
- `src/services/notification.service.ts` (baru)
- `src/db/schema.ts` → `notifications` (baru)

**Schema Additions:**
```typescript
notifications: {
  id, userId,
  type: 'email' | 'push' | 'sms',
  title (text),
  message (text),
  read (boolean),
  scheduledAt (timestamp),
  sentAt (timestamp),
  createdAt
}
```

**Tasks:**
- [ ] Setup notification schema
- [ ] Setup Resend/SendGrid untuk email (atau Cloudflare Email Routing)
- [ ] Implement `sendNotification()` — queue & send
- [ ] Endpoint: `GET /api/notifications` — list user's notifications
- [ ] Endpoint: `POST /api/notifications/:id/read` — mark as read
- [ ] Setup automated triggers:
  - Contract expiring reminder (30 days before)
  - Payment due reminder
  - Inspection pending notification
  - Dispute update alerts
  - Escrow released confirmation

**Dependencies:** Email service provider

---

#### **6.2 Performance & Polish** ✨
**Tasks:**
- [ ] Setup rate limiting (Better Auth sudah ada, tambah untuk endpoints lain)
- [ ] Setup caching untuk frequently-accessed data (dashboard, property list)
- [ ] Audit logging untuk semua critical actions (contract sign, escrow release, verdict)
- [ ] Setup error monitoring (Sentry atau Cloudflare Logpush)
- [ ] API documentation update (generate OpenAPI spec)
- [ ] Load testing untuk critical endpoints
- [ ] Setup database migrations & seed data untuk testing

---

## 🗃️ Complete Database Schema (Final)

```
users
├── id, name, email, emailVerified, image, password
├── role: 'tenant' | 'landlord' | 'admin'
├── createdAt, updatedAt

session, account, verification (Better Auth)

properties
├── id, name, address, price, description, available
├── landlordId → users.id
├── rooms, type: 'kos' | 'apartment'
├── facilities (text[]), images (text[])
├── createdAt, updatedAt

bookings
├── id, propertyId → properties.id, userId → users.id
├── startDate, endDate
├── status: 'pending' | 'approved' | 'rejected' | 'completed'
├── createdAt, updatedAt

contracts
├── id, propertyId → properties.id, tenantId → users.id, landlordId → users.id
├── startDate, endDate, depositAmount, monthlyRent
├── contractText, fairnessScore, status
├── signedByTenant, signedByLandlord, signedAt, expiresAt
├── createdAt, updatedAt

inspections
├── id, contractId → contracts.id, propertyId → properties.id
├── type: 'check_in' | 'check_out'
├── status: 'pending' | 'analyzing' | 'completed' | 'failed'
├── totalPhotos, aiReport (json), damages (json)
├── createdAt, completedAt

inspection_items
├── id, inspectionId → inspections.id
├── photoUrl, roomType, description
├── condition: 'good' | 'minor_damage' | 'major_damage'
├── severityScore, estimatedRepairCost, aiNotes
├── createdAt

escrows
├── id, contractId → contracts.id
├── amount, fee, status
├── midtransOrderId, paymentUrl
├── releasedAt, releasedTo, releaseReason
├── createdAt, updatedAt

payments
├── id, escrowId → escrows.id
├── type: 'deposit' | 'rent' | 'refund' | 'deduction'
├── amount, status, midtransTransactionId
├── paymentMethod, paidAt, createdAt

subscriptions
├── id, userId → users.id
├── plan: 'free' | 'pro', status
├── startedAt, expiresAt, midtransSubscriptionId
├── createdAt, updatedAt

disputes
├── id, contractId → contracts.id, inspectionId → inspections.id
├── initiatedBy → users.id
├── status, aiVerdict (json), aiVerdictReason, confidenceScore
├── acceptedByTenant, acceptedByLandlord
├── escalatedAt, resolvedAt, createdAt, updatedAt

dispute_messages
├── id, disputeId → disputes.id
├── userId → users.id, message, attachments (text[])
├── createdAt

dispute_evidence
├── id, disputeId → disputes.id
├── submittedBy → users.id, evidenceType, url, description
├── createdAt

reviews
├── id, contractId → contracts.id
├── reviewerId → users.id, revieweeId → users.id
├── rating (1-5), comment, createdAt

notifications
├── id, userId → users.id
├── type, title, message, read
├── scheduledAt, sentAt, createdAt
```

---

## 🔐 API Endpoints Summary

| Module | Method | Endpoint | Access | Status |
|---|---|---|---|---|
| **Auth** | POST/GET | `/api/auth/*` | Public | ✅ |
| **Users** | GET | `/api/me` | Authenticated | ❌ |
| | PATCH | `/api/users/me` | Authenticated | ❌ |
| | GET | `/api/users/:id/reputation` | Public | ❌ |
| **Properties** | GET | `/api/properties` | Public | ❌ |
| | GET | `/api/properties/:id` | Public | ❌ |
| | POST | `/api/properties` | Landlord | ❌ |
| | PATCH | `/api/properties/:id` | Owner | ❌ |
| | DELETE | `/api/properties/:id` | Owner | ❌ |
| | GET | `/api/properties/my` | Landlord | ❌ |
| **Bookings** | POST | `/api/bookings` | Tenant | ❌ |
| | POST | `/api/bookings/:id/accept` | Landlord | ❌ |
| | POST | `/api/bookings/:id/reject` | Landlord | ❌ |
| | POST | `/api/bookings/:id/cancel` | Tenant | ❌ |
| | GET | `/api/bookings/my` | Authenticated | ❌ |
| **Contracts** | POST | `/api/contracts/generate` | Authenticated | ❌ |
| | GET | `/api/contracts/:id` | Parties | ❌ |
| | POST | `/api/contracts/:id/sign` | Parties | ❌ |
| | POST | `/api/contracts/:id/regenerate` | Parties | ❌ |
| | GET | `/api/contracts/:id/fairness` | Parties | ❌ |
| **Inspections** | POST | `/api/inspections` | Auto | ❌ |
| | POST | `/api/inspections/:id/photos` | Parties | ❌ |
| | GET | `/api/inspections/:id` | Parties | ❌ |
| | POST | `/api/inspections/:id/analyze` | System | ❌ |
| | POST | `/api/inspections/:id/compare` | System | ❌ |
| **Uploads** | POST | `/api/uploads/presign` | Authenticated | ❌ |
| | DELETE | `/api/uploads/:key` | Owner | ❌ |
| | GET | `/api/uploads/:key/url` | Authenticated | ❌ |
| **Escrows** | POST | `/api/escrows` | System | ❌ |
| | GET | `/api/escrows/:id` | Parties | ❌ |
| | POST | `/api/escrows/:id/pay` | Tenant | ❌ |
| **Payments** | GET | `/api/payments/my` | Authenticated | ❌ |
| **Subscriptions** | POST | `/api/subscriptions/upgrade` | Landlord | ❌ |
| | GET | `/api/subscriptions/me` | Landlord | ❌ |
| | POST | `/api/subscriptions/cancel` | Landlord | ❌ |
| **Disputes** | POST | `/api/disputes` | Parties | ❌ |
| | GET | `/api/disputes/:id` | Parties | ❌ |
| | POST | `/api/disputes/:id/message` | Parties | ❌ |
| | POST | `/api/disputes/:id/evidence` | Parties | ❌ |
| | POST | `/api/disputes/:id/mediate` | System | ❌ |
| | POST | `/api/disputes/:id/accept` | Parties | ❌ |
| | POST | `/api/disputes/:id/reject` | Parties | ❌ |
| **Dashboard** | GET | `/api/dashboard/tenant` | Tenant | ❌ |
| | GET | `/api/dashboard/landlord` | Landlord | ❌ |
| | GET | `/api/dashboard/analytics/property/:id` | Owner | ❌ |
| **Reviews** | POST | `/api/reviews` | Parties | ❌ |
| | GET | `/api/users/:id/reviews` | Public | ❌ |
| **Notifications** | GET | `/api/notifications` | Authenticated | ❌ |
| | POST | `/api/notifications/:id/read` | Owner | ❌ |
| **Webhooks** | POST | `/api/webhooks/midtrans` | System | ❌ |
| | POST | `/api/webhooks/midtrans/subscription` | System | ❌ |

---

## 🛠️ Services (Cross-Module)

| Service | File | Purpose |
|---|---|---|
| **AI Service** | `src/services/ai.service.ts` | Gemini/OpenRouter wrapper |
| **R2 Storage** | `src/services/r2.service.ts` | File upload, delete, URL |
| **Midtrans** | `src/services/midtrans.service.ts` | Payment & Escrow |
| **Notification** | `src/services/notification.service.ts` | Email, push, SMS |
| **Reputation** | `src/services/reputation.service.ts` | Calculate user scores |

---

## 🔑 Environment Variables (Final)

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
MIDTRANS_ENVIRONMENT=production|sandbox

# Notifications (Resend)
RESEND_API_KEY=...

# General
NODE_ENV=production
```

---

## 📅 Timeline Summary

| Phase | Duration | Deliverables |
|---|---|---|
| **Phase 1: Foundation** | Week 1-2 | Auth, Properties, R2 Storage |
| **Phase 2: Rental Lifecycle** | Week 3-4 | Contracts, Bookings, AI Inspection |
| **Phase 3: Escrow & Payments** | Week 5-6 | Midtrans, Escrow, Subscriptions |
| **Phase 4: Dispute Resolution** | Week 7-8 | AI Arbitration, Evidence System |
| **Phase 5: Dashboard & Analytics** | Week 9-10 | Dashboards, Reputation System |
| **Phase 6: Notifications & Polish** | Week 11-12 | Email, Reminders, Performance |

---

## 🎯 Priority Legend

| Priority | Meaning | Action |
|---|---|---|
| **P0** | Critical — MVP harus ada | Kerjain dulu |
| **P1** | Important — Perlu untuk production | Phase berikutnya |
| **P2** | Nice to have — Bisa ditunda | Nanti saja |

---

## ✅ Next Steps (Mulai Sekarang)

1. **[P0] Setup R2 Bucket** di Cloudflare Dashboard → dapat credentials
2. **[P0] Setup AI API Key** — Gemini Google AI Studio atau OpenRouter
3. **[P0] Setup Midtrans Sandbox** — dapat API keys (bisa nanti Phase 3)
4. **[P0] Start Phase 1** — Property CRUD + R2 upload

**Mau saya mulai implement Phase 1 sekarang?**
