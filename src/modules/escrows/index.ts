import { createRouter } from "@/factory";
import { getMyEscrowsRoute, initiatePaymentRoute } from "./escrows.routes";
import {
  getMyEscrowsHandler,
  initiatePaymentHandler,
} from "./escrows.handlers";

const escrowsRouter = createRouter();

escrowsRouter.openapi(initiatePaymentRoute, initiatePaymentHandler);

escrowsRouter.openapi(getMyEscrowsRoute, getMyEscrowsHandler);

export default escrowsRouter;
