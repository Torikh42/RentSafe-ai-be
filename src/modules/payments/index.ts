import { createRouter } from "@/factory";
import { authMiddleware } from "@/middleware/auth";
import { getMyPaymentsRoute } from "./payments.routes";
import { getMyPaymentsHandler } from "./payments.handlers";

export const paymentsRouter = createRouter();

paymentsRouter.use("*", authMiddleware);

paymentsRouter.openapi(getMyPaymentsRoute, getMyPaymentsHandler);
