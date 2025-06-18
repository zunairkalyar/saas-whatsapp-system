const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");
const { validateWebhookSignature } = require("../middleware/webhookValidation");

// Shopify webhook endpoint
router.post("/shopify", validateWebhookSignature, webhookController.handleShopifyWebhook);

// Test webhook endpoint (for development)
router.post("/test", webhookController.handleTestWebhook);

// Webhook logs endpoint
router.get("/logs", webhookController.getWebhookLogs);

module.exports = router;

