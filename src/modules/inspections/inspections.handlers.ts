import type { RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../factory";
import { getDb } from "../../db";
import { InspectionsService } from "../../services/inspections.service";
import { CloudinaryService } from "../../services/cloudinary.service";
import {
  analyzeInspectionRoute,
  getPropertyInspectionsRoute,
  compareInspectionsRoute,
} from "./inspections.routes";

export const analyzeInspectionHandler: RouteHandler<
  typeof analyzeInspectionRoute,
  AppEnv
> = async (c) => {
  const user = c.var.user;
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { propertyId, type, images } = c.req.valid("form");

  const db = getDb(c.env);

  // Create Cloudinary service from environment variables
  const cloudinary = new CloudinaryService(
    c.env.CLOUDINARY_CLOUD_NAME,
    c.env.CLOUDINARY_API_KEY,
    c.env.CLOUDINARY_API_SECRET,
  );

  const service = new InspectionsService(
    cloudinary,
    c.env.GOOGLE_GENERATIVE_AI_API_KEY,
    db,
  );

  let files = Array.isArray(images) ? images : [images];

  try {
    const imagesData = [];
    for (const file of files) {
      // Convert to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Analyze
      const aiAnalysis = await service.analyzeImageCondition(arrayBuffer);

      // Upload to Cloudinary
      const url = await service.uploadToCloudinary(
        file,
        "inspections",
        propertyId,
      );

      imagesData.push({ url, aiAnalysis });
    }

    // Save
    const inspection = await service.saveInspection({
      propertyId,
      landlordId: user.id,
      type,
      images: imagesData,
    });

    if (!inspection) {
      return c.json({ error: "Failed to retrieve saved inspection" }, 500);
    }
    return c.json(inspection, 201);
  } catch (error) {
    console.error("Inspection error:", error);
    return c.json({ error: "Failed to process inspection" }, 500);
  }
};

export const getPropertyInspectionsHandler: RouteHandler<
  typeof getPropertyInspectionsRoute,
  AppEnv
> = async (c) => {
  const db = getDb(c.env);

  // Create Cloudinary service from environment variables
  const cloudinary = new CloudinaryService(
    c.env.CLOUDINARY_CLOUD_NAME,
    c.env.CLOUDINARY_API_KEY,
    c.env.CLOUDINARY_API_SECRET,
  );

  const service = new InspectionsService(
    cloudinary,
    c.env.GOOGLE_GENERATIVE_AI_API_KEY,
    db,
  );

  const { propertyId } = c.req.valid("param");

  try {
    const inspections = await service.getInspectionsByProperty(propertyId);
    return c.json(inspections, 200);
  } catch (error) {
    console.error("Get inspections error:", error);
    return c.json({ error: "Failed to retrieve inspections" }, 500);
  }
};

export const compareInspectionsHandler: RouteHandler<
  typeof compareInspectionsRoute,
  AppEnv
> = async (c) => {
  const user = c.var.user;
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.valid("param");
  const db = getDb(c.env);

  const cloudinary = new CloudinaryService(
    c.env.CLOUDINARY_CLOUD_NAME,
    c.env.CLOUDINARY_API_KEY,
    c.env.CLOUDINARY_API_SECRET,
  );

  const service = new InspectionsService(
    cloudinary,
    c.env.GOOGLE_GENERATIVE_AI_API_KEY,
    db,
  );

  try {
    const result = await service.compareInspections(id);
    if (!result) {
      return c.json({ error: "Inspection not found" }, 404);
    }
    return c.json(result, 200);
  } catch (error) {
    console.error("Compare inspections error:", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: error.message }, 404);
    }
    if (
      error instanceof Error &&
      error.message.includes("must be a check-out")
    ) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to compare inspections" }, 500);
  }
};
