import { createRouter } from "../../factory";
import {
  generateContractRoute,
  getContractRoute,
  signContractRoute,
  getFairnessRoute,
} from "./contracts.routes";
import {
  generateContractHandler,
  getContractHandler,
  signContractHandler,
  getFairnessHandler,
} from "./contracts.handlers";

const contractsRouter = createRouter()
  .openapi(generateContractRoute, generateContractHandler)
  .openapi(getContractRoute, getContractHandler)
  .openapi(signContractRoute, signContractHandler)
  .openapi(getFairnessRoute, getFairnessHandler);

export default contractsRouter;
