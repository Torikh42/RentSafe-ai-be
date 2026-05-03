import { createRouter } from "../../factory";
import {
  analyzeInspectionRoute,
  getPropertyInspectionsRoute,
  compareInspectionsRoute,
} from "./inspections.routes";
import {
  analyzeInspectionHandler,
  getPropertyInspectionsHandler,
  compareInspectionsHandler,
} from "./inspections.handlers";
import { authMiddleware } from "../../middleware/auth";

const inspectionsRouter = createRouter();

// Both routes require authentication
inspectionsRouter.use("*", authMiddleware);

inspectionsRouter.openapi(analyzeInspectionRoute, analyzeInspectionHandler);
inspectionsRouter.openapi(
  getPropertyInspectionsRoute,
  getPropertyInspectionsHandler,
);
inspectionsRouter.openapi(compareInspectionsRoute, compareInspectionsHandler);

export default inspectionsRouter;
