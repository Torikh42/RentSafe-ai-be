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
