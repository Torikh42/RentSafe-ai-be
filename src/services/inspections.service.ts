import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { inspections, inspectionImages } from "../db/schema";
import * as schema from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
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
      comparisonReport: inspection.comparisonReport
        ? JSON.parse(inspection.comparisonReport)
        : null,
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
        comparisonReport: insp.comparisonReport
          ? JSON.parse(insp.comparisonReport)
          : null,
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

  /**
   * Compare a check-out inspection against its baseline check-in
   */
  async compareInspections(postInspectionId: string) {
    const postInspection = await this.getInspection(postInspectionId);
    if (!postInspection) throw new Error("Check-out inspection not found");
    if (postInspection.type !== "post")
      throw new Error("Inspection must be a check-out (post) type");

    // Find the corresponding check-in
    const preInspection = await this.db.query.inspections.findFirst({
      where: and(
        eq(inspections.propertyId, postInspection.propertyId),
        eq(inspections.type, "pre"),
      ),
      orderBy: [desc(inspections.createdAt)],
    });

    if (!preInspection)
      throw new Error("No baseline check-in found for this property");

    const preImages = await this.db.query.inspectionImages.findMany({
      where: eq(inspectionImages.inspectionId, preInspection.id),
    });

    // We prepare the prompt with context from the old analyses and new analyses
    // Text-based delta comparison using Gemini
    const googleClient = createGoogleGenerativeAI({
      apiKey: this.geminiApiKey,
    });

    const ComparisonSchema = z.object({
      summary: z.string(),
      newDamages: z.array(
        z.object({
          description: z.string(),
          severity: z.enum(["low", "medium", "high"]),
          estimatedRepairCost: z.number(),
        }),
      ),
      totalEstimatedCost: z.number(),
    });

    const promptText = `
    You are an AI arbitrator for a rental platform. You need to compare the "Check-in" (baseline) inspection and the "Check-out" inspection.
    
    Check-in Baseline Findings:
    ${JSON.stringify(
      preImages.map((img) =>
        img.aiAnalysis ? JSON.parse(img.aiAnalysis) : {},
      ),
      null,
      2,
    )}
    
    Check-out Current Findings:
    ${JSON.stringify(
      postInspection.images.map((img) => img.aiAnalysis),
      null,
      2,
    )}
    
    Identify ONLY NEW material damages that appear in the Check-out findings but were NOT present in the Check-in baseline. 
    Ignore normal wear-and-tear. 
    Provide a summary, a list of new damages, and calculate the total estimated repair cost for the NEW damages only.
    `;

    const models = [
      "gemini-3.1-flash-lite-preview",
      "gemini-3-flash-preview",
      "gemini-3.1-pro-preview",
      "gemini-2.5-flash-lite",
    ];

    let comparisonReport = null;
    let lastError: unknown = null;

    for (const modelId of models) {
      try {
        const result = await generateObject({
          model: googleClient(modelId),
          schema: ComparisonSchema,
          messages: [{ role: "user", content: promptText }],
        });
        comparisonReport = result.object;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!comparisonReport) {
      console.error("Comparison AI failed", lastError);
      throw new Error("Failed to compare inspections with AI");
    }

    // Update the post inspection with the reference and the comparison report
    await this.db
      .update(inspections)
      .set({
        referenceInspectionId: preInspection.id,
        comparisonReport: JSON.stringify(comparisonReport),
      })
      .where(eq(inspections.id, postInspection.id));

    return await this.getInspection(postInspection.id);
  }
}
