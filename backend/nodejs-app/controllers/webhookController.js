const { User, Order, WebhookLog, MessageTemplate, Message } = require("../models");
const NotificationService = require("../services/notificationService");

exports.handleShopifyWebhook = async (req, res) => {
    const startTime = Date.now();
    let webhookLog;

    try {
        const topic = req.get("X-Shopify-Topic");
        const shopDomain = req.get("X-Shopify-Shop-Domain");
        const payload = req.body;
        const headers = {
            "X-Shopify-Topic": topic,
            "X-Shopify-Shop-Domain": shopDomain,
            "X-Shopify-Hmac-Sha256": req.get("X-Shopify-Hmac-Sha256"),
            "X-Shopify-Order-Id": req.get("X-Shopify-Order-Id"),
            "X-Shopify-API-Version": req.get("X-Shopify-API-Version")
        };

        console.log(`Received webhook: ${topic} from ${shopDomain}`);

        // Find user by shop domain
        const user = await User.findByShopDomain(shopDomain);
        
        // Create webhook log entry
        webhookLog = await WebhookLog.create({
            user_id: user ? user.id : null,
            shop_domain: shopDomain,
            webhook_topic: topic,
            shopify_order_id: payload.id || null,
            payload: payload,
            headers: headers,
            signature_valid: req.signatureValid,
            processing_status: "pending"
        });

        if (!user) {
            await webhookLog.markAsIgnored("Shop domain not found in system");
            return res.status(404).json({ error: "Shop not found" });
        }

        if (!user.isActive()) {
            await webhookLog.markAsIgnored("User account is not active");
            return res.status(403).json({ error: "User account inactive" });
        }

        // Process different webhook topics
        switch (topic) {
            case "orders/create":
            case "orders/paid":
            case "orders/fulfilled":
            case "orders/cancelled":
            case "orders/updated":
                await handleOrderWebhook(user, topic, payload, webhookLog);
                break;
            default:
                await webhookLog.markAsIgnored(`Unsupported webhook topic: ${topic}`);
                console.log(`Unsupported webhook topic: ${topic}`);
        }

        const processingTime = Date.now() - startTime;
        await webhookLog.markAsProcessed(processingTime);

        res.status(200).json({ status: "success", message: "Webhook processed" });

    } catch (error) {
        console.error("Error processing webhook:", error);
        
        if (webhookLog) {
            const processingTime = Date.now() - startTime;
            await webhookLog.markAsFailed(error.message, processingTime);
        }

        res.status(500).json({ error: "Internal server error" });
    }
};

async function handleOrderWebhook(user, topic, payload, webhookLog) {
    try {
        // Extract order data from payload
        const orderData = {
            user_id: user.id,
            shopify_order_id: payload.id,
            order_number: payload.order_number || payload.name,
            customer_email: payload.customer?.email,
            customer_phone: payload.customer?.phone,
            customer_first_name: payload.customer?.first_name,
            customer_last_name: payload.customer?.last_name,
            order_total_cents: payload.total_price_usd ? Math.round(parseFloat(payload.total_price_usd) * 100) : null,
            currency: payload.currency || "USD",
            order_status: payload.order_status_url ? "confirmed" : "pending",
            financial_status: payload.financial_status,
            fulfillment_status: payload.fulfillment_status,
            line_items_count: payload.line_items ? payload.line_items.length : 0,
            shipping_address: payload.shipping_address,
            billing_address: payload.billing_address,
            line_items: payload.line_items,
            tags: payload.tags,
            note: payload.note,
            shopify_created_at: payload.created_at ? new Date(payload.created_at) : null,
            shopify_updated_at: payload.updated_at ? new Date(payload.updated_at) : null,
            webhook_received_at: new Date()
        };

        // Find or create order
        let order = await Order.findByShopifyOrderId(user.id, payload.id);
        
        if (order) {
            // Update existing order
            await order.update(orderData);
            console.log(`Updated existing order: ${order.order_number}`);
        } else {
            // Create new order
            order = await Order.create(orderData);
            console.log(`Created new order: ${order.order_number}`);
        }

        // Process notification based on webhook topic
        const eventType = getEventTypeFromTopic(topic);
        if (eventType) {
            const notificationResult = await NotificationService.sendNotification(user.id, orderData, eventType);
            
            if (notificationResult.blocked) {
                console.log(`🚫 Notification blocked for user ${user.id}: ${notificationResult.error}`);
            } else if (notificationResult.success) {
                console.log(`✅ Notification sent successfully for user ${user.id}`);
            } else {
                console.log(`❌ Notification failed for user ${user.id}: ${notificationResult.error}`);
            }
        }

        await order.markAsProcessed();

    } catch (error) {
        console.error("Error handling order webhook:", error);
        throw error;
    }
}

function getEventTypeFromTopic(topic) {
    const topicMap = {
        "orders/create": "order_created",
        "orders/paid": "order_paid",
        "orders/fulfilled": "order_fulfilled",
        "orders/cancelled": "order_cancelled",
        "orders/updated": "order_updated"
    };
    return topicMap[topic];
}

exports.handleTestWebhook = async (req, res) => {
    try {
        console.log("Test webhook received:", req.body);
        
        // Create a test webhook log
        await WebhookLog.create({
            user_id: null,
            shop_domain: "test.myshopify.com",
            webhook_topic: "test/webhook",
            payload: req.body,
            headers: req.headers,
            signature_valid: true,
            processing_status: "processed"
        });

        res.status(200).json({ 
            status: "success", 
            message: "Test webhook received",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error processing test webhook:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getWebhookLogs = async (req, res) => {
    try {
        const userId = req.session.user?.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const whereClause = userId ? { user_id: userId } : {};

        const { count, rows: logs } = await WebhookLog.findAndCountAll({
            where: whereClause,
            order: [["created_at", "DESC"]],
            limit,
            offset
        });

        const totalPages = Math.ceil(count / limit);

        res.render("pages/webhooks/logs", {
            title: "Webhook Logs",
            layout: "layouts/main",
            logs,
            currentPage: page,
            totalPages,
            totalLogs: count,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        });
    } catch (error) {
        console.error("Error fetching webhook logs:", error);
        req.flash("error", "Error fetching webhook logs");
        res.redirect("/dashboard");
    }
};

