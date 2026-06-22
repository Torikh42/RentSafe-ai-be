import { createRouter } from "@/factory";
import { midtransWebhookRoute } from "./webhooks.routes";
import { midtransWebhookHandler } from "./webhooks.handlers";

const webhooksRouter = createRouter();

webhooksRouter.openapi(midtransWebhookRoute, midtransWebhookHandler);

export default webhooksRouter;
