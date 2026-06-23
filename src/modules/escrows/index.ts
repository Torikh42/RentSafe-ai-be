import { createRouter } from "@/factory";
import {
  getMyEscrowsRoute,
  initiatePaymentRoute,
  getEscrowByIdRoute,
} from "./escrows.routes";
import {
  getMyEscrowsHandler,
  initiatePaymentHandler,
  getEscrowByIdHandler,
} from "./escrows.handlers";

const escrowsRouter = createRouter();

escrowsRouter.openapi(initiatePaymentRoute, initiatePaymentHandler);

escrowsRouter.openapi(getMyEscrowsRoute, getMyEscrowsHandler);

escrowsRouter.openapi(getEscrowByIdRoute, getEscrowByIdHandler);

export default escrowsRouter;
