const crypto = require("crypto");

exports.validateWebhookSignature = (req, res, next) => {
    const signature = req.get("X-Shopify-Hmac-Sha256");
    const body = req.rawBody || JSON.stringify(req.body);
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

    if (!signature) {
        return res.status(401).json({ error: "Missing webhook signature" });
    }

    if (!webhookSecret) {
        console.error("SHOPIFY_WEBHOOK_SECRET not configured");
        return res.status(500).json({ error: "Webhook secret not configured" });
    }

    try {
        // Create HMAC hash
        const hmac = crypto.createHmac("sha256", webhookSecret);
        hmac.update(body, "utf8");
        const calculatedSignature = hmac.digest("base64");

        // Compare signatures
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature))) {
            console.error("Invalid webhook signature");
            return res.status(401).json({ error: "Invalid webhook signature" });
        }

        // Store signature validation result for logging
        req.signatureValid = true;
        next();
    } catch (error) {
        console.error("Error validating webhook signature:", error);
        req.signatureValid = false;
        return res.status(400).json({ error: "Error validating signature" });
    }
};

