import { createRouter } from "../../factory";
import {
  generateContractRoute,
  getContractRoute,
  signContractRoute,
  getFairnessRoute,
  getMyContractsRoute,
} from "./contracts.routes";
import {
  generateContractHandler,
  getContractHandler,
  signContractHandler,
  getFairnessHandler,
  getMyContractsHandler,
} from "./contracts.handlers";

const contractsRouter = createRouter()
  .openapi(generateContractRoute, generateContractHandler)
  .openapi(getMyContractsRoute, getMyContractsHandler)
  .openapi(getContractRoute, getContractHandler)
  .openapi(signContractRoute, signContractHandler)
  .openapi(getFairnessRoute, getFairnessHandler);

export default contractsRouter;
