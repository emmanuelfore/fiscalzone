import { Router } from "express";
import sageWebhookRouter from "../../lib/sage-webhook.js";

const router = Router();

// POST /api/v1/webhooks/sage (Task 10.1, Req 11.2)
router.use("/sage", sageWebhookRouter);

export default router;
