import { createRouter } from "../../factory";
import { getStatisticsRoute } from "./statistics.routes";
import { getStatisticsHandler } from "./statistics.handlers";

const statisticsRouter = createRouter().openapi(
  getStatisticsRoute,
  getStatisticsHandler,
);

export default statisticsRouter;
