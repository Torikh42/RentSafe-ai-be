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

  // Validate images array is not empty
  if (!images || (Array.isArray(images) && images.length === 0)) {
    return c.json({ error: "Please upload at least one image" }, 400);
  }

  const db = getDb(c.env);

  // BOLA: Check if property exists and user is the landlord of the property
  const property = await db.query.properties.findFirst({
    where: (p, { eq }) => eq(p.id, propertyId),
  });

  if (!property) {
    return c.json({ error: "Property not found" }, 404);
  }

  if (property.landlordId !== user.id) {
    return c.json(
      {
        error:
          "Forbidden - only the property owner (landlord) can perform inspections",
      },
      403,
    );
  }

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
    const imagesData = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();

        const [aiAnalysis, url] = await Promise.all([
          service.analyzeImageCondition(arrayBuffer),
          service.uploadToCloudinary(file, "inspections", propertyId),
        ]);

        return { url, aiAnalysis };
      }),
    );

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
  const user = c.var.user;
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

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

  // BOLA: Check if property exists and user is landlord or tenant
  const property = await db.query.properties.findFirst({
    where: (p, { eq }) => eq(p.id, propertyId),
  });

  if (!property) {
    return c.json({ error: "Property not found" }, 404);
  }

  const isLandlord = property.landlordId === user.id;
  let isTenant = false;

  if (!isLandlord) {
    const activeContract = await db.query.contracts.findFirst({
      where: (ctr, { eq, and, inArray }) =>
        and(
          eq(ctr.propertyId, propertyId),
          eq(ctr.tenantId, user.id),
          inArray(ctr.status, [
            "active",
            "pending_signature",
            "pending_payment",
          ]),
        ),
    });
    if (activeContract) {
      isTenant = true;
    } else {
      const approvedBooking = await db.query.bookings.findFirst({
        where: (b, { eq, and }) =>
          and(
            eq(b.propertyId, propertyId),
            eq(b.userId, user.id),
            eq(b.status, "approved"),
          ),
      });
      if (approvedBooking) {
        isTenant = true;
      }
    }
  }

  try {
    const inspections = await service.getInspectionsByProperty(propertyId);

    // If user is authorized to see full details (is landlord or tenant)
    if (isLandlord || isTenant) {
      return c.json(inspections, 200);
    }

    // Otherwise, strip out sensitive data for public viewing
    const sanitizedInspections = inspections.map((insp) => ({
      id: insp.id,
      propertyId: insp.propertyId,
      landlordId: insp.landlordId,
      type: insp.type,
      status: insp.status,
      createdAt: insp.createdAt,
      referenceInspectionId: null,
      comparisonReport: null,
      summary: null,
      images: [],
    }));

    return c.json(sanitizedInspections, 200);
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

  // BOLA: Check if inspection and property exist, and user is landlord of the property
  const inspection = await db.query.inspections.findFirst({
    where: (insp, { eq }) => eq(insp.id, id),
  });

  if (!inspection) {
    return c.json({ error: "Inspection not found" }, 404);
  }

  const property = await db.query.properties.findFirst({
    where: (p, { eq }) => eq(p.id, inspection.propertyId),
  });

  if (!property) {
    return c.json(
      { error: "Property associated with inspection not found" },
      404,
    );
  }

  if (property.landlordId !== user.id) {
    return c.json(
      {
        error:
          "Forbidden - only the property owner (landlord) can compare inspections",
      },
      403,
    );
  }

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
