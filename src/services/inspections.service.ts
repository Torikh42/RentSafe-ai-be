import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { inspections, inspectionImages } from "../db/schema";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// Define the schema for the AI response
const AiAnalysisResultSchema = z.object({
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

type AiAnalysisResult = z.infer<typeof AiAnalysisResultSchema>;

// Use opaque type to avoid R2Bucket type conflicts between @cloudflare/workers-types
// and lib.webworker.d.ts - both define R2Bucket with incompatible Headers types
export type R2BucketLike = {
  put(
    key: string,
    value: ArrayBuffer | string | Blob,
    options?: { httpMetadata?: Record<string, string> },
  ): Promise<{ key: string } | null>;
  get(key: string): Promise<ReadableStream | null>;
  head(key: string): Promise<{ httpMetadata?: Record<string, string> } | null>;
  delete(key: string): Promise<void>;
};

export class InspectionsService {
  constructor(
    private storage: R2BucketLike,
    private r2PublicUrl: string,
    private geminiApiKey: string,
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Upload a file to Cloudflare R2
   */
  async uploadToR2(
    file: File,
    folder: string = "inspections",
  ): Promise<string> {
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${folder}/${timestamp}-${cleanName}`;

    const buffer = await file.arrayBuffer();
    await this.storage.put(key, buffer);
    return `${this.r2PublicUrl}/${key}`;
  }

  /**
   * Analyze an image using Gemini 3 Flash
   */
  async analyzeImageCondition(
    imageBuffer: ArrayBuffer,
  ): Promise<AiAnalysisResult> {
    try {
      const googleClient = createGoogleGenerativeAI({
        apiKey: this.geminiApiKey,
      });

      const uint8Array = new Uint8Array(imageBuffer);

      const result = await generateObject({
        model: googleClient("gemini-3.1-flash-lite-preview"),
        schema: AiAnalysisResultSchema,
        messages: [
          {
            role: "user" as const,
            content: [
              {
                type: "text",
                text: "Analyze this property inspection image. Identify the room type, describe its overall condition, and list any detected damages or issues with severity and estimated repair cost.",
              },
              { type: "image", image: uint8Array },
            ],
          },
        ],
      });

      return result.object;
    } catch (error) {
      console.error("AI Analysis Error:", error);
      throw new Error("Failed to analyze image with AI.");
    }
  }

  /**
   * Complete inspection workflow: store in DB
   */
  async saveInspection(data: {
    propertyId: string;
    landlordId: string;
    type: "pre" | "post";
    images: { url: string; aiAnalysis: AiAnalysisResult }[];
  }) {
    // Generate UUIDs for Drizzle inserts
    const inspectionId = crypto.randomUUID();

    let overallSummary = "Inspection completed.";
    if (data.images.length > 0) {
      const issueCount = data.images.reduce(
        (acc, img) => acc + img.aiAnalysis.detectedIssues.length,
        0,
      );
      overallSummary = `Inspection completed with ${issueCount} detected issue(s).`;
    }

    // Insert inspection
    await this.db.insert(inspections).values({
      id: inspectionId,
      propertyId: data.propertyId,
      landlordId: data.landlordId,
      type: data.type,
      summary: overallSummary,
      status: "completed",
    });

    // Insert images
    if (data.images.length > 0) {
      const imagesToInsert = data.images.map((img) => ({
        id: crypto.randomUUID(),
        inspectionId,
        url: img.url,
        aiAnalysis: JSON.stringify(img.aiAnalysis),
      }));

      await this.db.insert(inspectionImages).values(imagesToInsert);
    }

    return await this.getInspection(inspectionId);
  }

  async getInspection(inspectionId: string) {
    const inspection = await this.db.query.inspections.findFirst({
      where: eq(inspections.id, inspectionId),
    });

    if (!inspection) return null;

    const images = await this.db.query.inspectionImages.findMany({
      where: eq(inspectionImages.inspectionId, inspectionId),
    });

    return {
      ...inspection,
      createdAt: inspection.createdAt.toISOString(),
      images: images.map((img) => ({
        id: img.id,
        url: img.url,
        aiAnalysis: img.aiAnalysis
          ? (JSON.parse(img.aiAnalysis) as AiAnalysisResult)
          : null,
      })),
    };
  }

  async getInspectionsByProperty(propertyId: string) {
    const propertyInspections = await this.db.query.inspections.findMany({
      where: eq(inspections.propertyId, propertyId),
    });

    const result = [];
    for (const insp of propertyInspections) {
      const images = await this.db.query.inspectionImages.findMany({
        where: eq(inspectionImages.inspectionId, insp.id),
      });

      result.push({
        ...insp,
        createdAt: insp.createdAt.toISOString(),
        images: images.map((img) => ({
          id: img.id,
          url: img.url,
          aiAnalysis: img.aiAnalysis
            ? (JSON.parse(img.aiAnalysis) as AiAnalysisResult)
            : null,
        })),
      });
    }

    return result;
  }
}
