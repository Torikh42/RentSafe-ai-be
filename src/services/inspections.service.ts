import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { inspections, inspectionImages } from "../db/schema";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { CloudinaryService } from "./cloudinary.service";

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

export class InspectionsService {
  constructor(
    private cloudinary: CloudinaryService,
    private geminiApiKey: string,
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Upload a file to Cloudinary
   */
  async uploadToCloudinary(
    file: File,
    folder: string = "inspections",
    propertyId?: string,
  ): Promise<string> {
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const publicId = propertyId
      ? `${propertyId}/${timestamp}-${cleanName}`
      : `${timestamp}-${cleanName}`;

    const buffer = await file.arrayBuffer();
    const url = await this.cloudinary.upload(buffer, folder, publicId);
    return url;
  }

  /**
   * Analyze an image using Gemini with fallback models
   */
  async analyzeImageCondition(
    imageBuffer: ArrayBuffer,
  ): Promise<AiAnalysisResult> {
    const googleClient = createGoogleGenerativeAI({
      apiKey: this.geminiApiKey,
    });

    const uint8Array = new Uint8Array(imageBuffer);

    // Order of preference for models (Waterfall fallback)
    const models = [
      "gemini-3.1-flash-lite-preview",
      "gemini-3-flash-preview",
      "gemini-3.1-pro-preview",
      "gemini-2.5-flash-lite", // Fallback for stability if preview fails
    ];

    let lastError: unknown = null;

    for (const modelId of models) {
      try {
        const result = await generateObject({
          model: googleClient(modelId),
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
        console.warn(
          `AI Analysis with ${modelId} failed, trying fallback...`,
          error,
        );
        lastError = error;
        // Continue to next model
      }
    }

    console.error("All AI models failed to analyze the image.");
    throw (
      lastError ||
      new Error("Failed to analyze image with any available AI model.")
    );
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
