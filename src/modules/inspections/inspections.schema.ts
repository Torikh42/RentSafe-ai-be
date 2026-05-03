import { z } from "@hono/zod-openapi";

// Response Schema for Inspection Analysis
export const AiAnalysisSchema = z.object({
  detectedIssues: z.array(
    z.object({
      description: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      estimatedRepairCost: z.number().optional(),
    }),
  ),
  overallCondition: z.string(),
  roomType: z.string(),
});

export const InspectionImageResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  aiAnalysis: AiAnalysisSchema.nullable(),
});

export const InspectionResponseSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  landlordId: z.string(),
  type: z.enum(["pre", "post"]),
  referenceInspectionId: z.string().nullable().optional(),
  comparisonReport: z.any().nullable().optional(), // Can be parsed JSON
  summary: z.string().nullable(),
  status: z.enum(["pending", "completed", "failed"]),
  createdAt: z.string().datetime(),
  images: z.array(InspectionImageResponseSchema),
});

export const AnalyzeInspectionRequestSchema = z.object({
  propertyId: z.string(),
  type: z.enum(["pre", "post"]),
});
