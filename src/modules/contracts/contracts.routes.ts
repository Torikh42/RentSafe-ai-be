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
