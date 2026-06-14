# AI Smart Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 2.2 (AI Smart Contracts) by creating a robust AI service wrapper using Gemini and building the Contracts module to generate, analyze, and sign contracts.

**Architecture:**

- **AI Service:** Wraps `@ai-sdk/google` to call Gemini models with a waterfall fallback logic. It generates contract text using `generateText` and analyzes fairness using `generateObject` for type-safe JSON output.
- **Contracts Module:** Exposes endpoints to trigger generation, fetch details, sign, and retrieve fairness analysis of contracts.
- **Service & Handlers:** Contracts service manages database operations and coordinates with the AI service. Handlers follow the `RouteHandler` type safety of Hono OpenAPI.

**Tech Stack:** Hono, Drizzle ORM, Zod OpenAPI, AI SDK (Vercel AI SDK `@ai-sdk/google`)

---

### Task 1: Create AI Service

**Files:**

- Create: `src/services/ai.service.ts`

- [ ] **Step 1: Write the AI Service class with structured outputs and fallbacks**

Create `src/services/ai.service.ts` using the Vercel AI SDK. Use `generateObject` for the fairness output to avoid fragile regex/JSON parsing.

```typescript
import { generateText, generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const FairnessResultSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
});

export class AIService {
  private google: ReturnType<typeof createGoogleGenerativeAI>;
  private models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"];

  constructor(apiKey: string) {
    this.google = createGoogleGenerativeAI({ apiKey });
  }

  async generateContract(
    property: { name: string; address: string },
    tenant: { name: string },
    landlord: { name: string },
    terms: {
      monthlyRent: number;
      depositAmount: number;
      startDate: Date;
      endDate: Date;
    },
  ): Promise<string> {
    const prompt = `
      Create a rental contract in Indonesian compliant with KUHPerdata for:
      Property: ${property.name} at ${property.address}
      Tenant: ${tenant.name}
      Landlord: ${landlord.name}
      Rent: ${terms.monthlyRent} IDR/month
      Deposit: ${terms.depositAmount} IDR
      Start Date: ${terms.startDate.toDateString()}
      End Date: ${terms.endDate.toDateString()}
      
      Output ONLY the contract text in plain text or simple markdown.
    `;

    let lastError: unknown = null;
    for (const modelId of this.models) {
      try {
        const { text } = await generateText({
          model: this.google(modelId),
          prompt,
        });
        return text;
      } catch (error) {
        console.warn(
          `Contract generation with ${modelId} failed, trying fallback...`,
          error,
        );
        lastError = error;
      }
    }
    throw lastError || new Error("Failed to generate contract with AI.");
  }

  async analyzeFairness(
    contractText: string,
  ): Promise<{ score: number; summary: string }> {
    const prompt = `
      Analyze the following rental contract for fairness between landlord and tenant.
      Provide a fairness score from 0 to 100 (where 100 is perfectly balanced, 0 is extremely biased).
      Also provide a 1-2 sentence plain language summary of who it benefits most.
      
      Contract:
      ${contractText}
    `;

    let lastError: unknown = null;
    for (const modelId of this.models) {
      try {
        const result = await generateObject({
          model: this.google(modelId),
          schema: FairnessResultSchema,
          prompt,
        });
        return result.object;
      } catch (error) {
        console.warn(
          `Fairness analysis with ${modelId} failed, trying fallback...`,
          error,
        );
        lastError = error;
      }
    }
    throw (
      lastError || new Error("Failed to analyze contract fairness with AI.")
    );
  }
}
```

---

### Task 2: Implement Contracts Schemas & Routes

**Files:**

- Create: `src/modules/contracts/contracts.schema.ts`
- Create: `src/modules/contracts/contracts.routes.ts`

- [ ] **Step 1: Define Schemas in `contracts.schema.ts`**

Define the schema and API response shapes. Make sure to use `.string().datetime()` for timestamp fields.

```typescript
import { z } from "@hono/zod-openapi";

export const contractSchema = z.object({
  id: z.string().openapi({ example: "contract_123" }),
  propertyId: z.string().openapi({ example: "prop_123" }),
  tenantId: z.string().openapi({ example: "usr_tenant" }),
  landlordId: z.string().openapi({ example: "usr_landlord" }),
  bookingId: z.string().openapi({ example: "book_123" }),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  depositAmount: z.number().int().openapi({ example: 5000000 }),
  monthlyRent: z.number().int().openapi({ example: 5000000 }),
  contractText: z.string().nullable().optional(),
  fairnessScore: z.number().int().nullable().optional(),
  status: z
    .enum(["draft", "pending_signature", "active", "expired", "terminated"])
    .openapi({ example: "draft" }),
  signedByTenant: z.boolean().openapi({ example: false }),
  signedByLandlord: z.boolean().openapi({ example: false }),
  signedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const generateContractBodySchema = z.object({
  bookingId: z.string().min(1),
});

export const contractResponseSchema = z.object({
  message: z.string(),
  data: contractSchema,
});

export const fairnessResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    score: z.number(),
    summary: z.string(),
  }),
});
```

- [ ] **Step 2: Define Routes in `contracts.routes.ts`**

Ensure that all returned HTTP status codes (200, 201, 400, 401, 403, 404, 500) are fully defined in the OpenAPI routes configurations to avoid compiler issues.

```typescript
import { createRoute, z } from "@hono/zod-openapi";
import {
  contractResponseSchema,
  generateContractBodySchema,
  fairnessResponseSchema,
} from "./contracts.schema";
import { errorResponseSchema } from "../../lib/common-schemas";

const paramIdSchema = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

export const generateContractRoute = createRoute({
  method: "post",
  path: "/generate",
  tags: ["Contracts"],
  request: {
    body: {
      content: { "application/json": { schema: generateContractBodySchema } },
    },
  },
  responses: {
    201: {
      description: "Contract generated",
      content: { "application/json": { schema: contractResponseSchema } },
    },
    400: {
      description: "Bad Request",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    404: {
      description: "Not Found",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    500: {
      description: "Internal Server Error",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

export const getContractRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Contracts"],
  request: { params: paramIdSchema },
  responses: {
    200: {
      description: "Get contract detail",
      content: { "application/json": { schema: contractResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    404: {
      description: "Not Found",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    500: {
      description: "Internal Server Error",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

export const signContractRoute = createRoute({
  method: "post",
  path: "/{id}/sign",
  tags: ["Contracts"],
  request: { params: paramIdSchema },
  responses: {
    200: {
      description: "Contract signed",
      content: { "application/json": { schema: contractResponseSchema } },
    },
    400: {
      description: "Bad Request",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    404: {
      description: "Not Found",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    500: {
      description: "Internal Server Error",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

export const getFairnessRoute = createRoute({
  method: "get",
  path: "/{id}/fairness",
  tags: ["Contracts"],
  request: { params: paramIdSchema },
  responses: {
    200: {
      description: "Get fairness score",
      content: { "application/json": { schema: fairnessResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    404: {
      description: "Not Found",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    500: {
      description: "Internal Server Error",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
```

---

### Task 3: Implement Contracts Handlers and Service

**Files:**

- Create: `src/modules/contracts/contracts.service.ts`
- Create: `src/modules/contracts/contracts.handlers.ts`
- Create: `src/modules/contracts/index.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Write Contracts Service**

Create `src/modules/contracts/contracts.service.ts`.
Implement `generateContract(bookingId, env)`. It must:

- Fetch booking, associated property, tenant, and landlord data from the DB.
- Instantiate `AIService` passing `env.GEMINI_API_KEY`.
- Generate contract text and fairness score using AI.
- Update the existing draft contract record (created during booking approval) with the generated text, fairness score, and change status to `pending_signature`.
  Implement `getContractById(id)`.
  Implement `signContract(id, userId, role)`. Updates `signedByTenant` or `signedByLandlord` depending on role. If both become true, updates status to `active`, sets `signedAt` to current date, and sets `expiresAt` to matching contract end date.

- [ ] **Step 2: Write Handlers**

Create `src/modules/contracts/contracts.handlers.ts` using the strict `RouteHandler` type. Add Date-to-ISO formatter to format database returned values before sending JSON response.

- [ ] **Step 3: Setup Router and Mount**

In `src/modules/contracts/index.ts`, construct the router using `createRouter()` and link all OpenAPI routes to handlers.
In `src/app.ts`, mount the router at `/api/contracts`.

- [ ] **Step 4: Update OpenAPI Docs**

Run `bun run openapi:generate` to regenerate the API specifications.

- [ ] **Step 5: Verify and Commit**

Run `bun run fl` and `bun run check`.
Commit the complete set of changes.
