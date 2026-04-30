import { createRouter } from "../../factory";
import {
  analyzeInspectionRoute,
  getPropertyInspectionsRoute,
} from "./inspections.routes";
import {
  analyzeInspectionHandler,
  getPropertyInspectionsHandler,
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

export default inspectionsRouter;
