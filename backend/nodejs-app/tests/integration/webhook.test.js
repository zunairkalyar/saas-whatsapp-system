const request = require("supertest");
const { expect } = require("chai");
const crypto = require("crypto");
const app = require("../../app");
const { sequelize } = require("../../config/database");
const { User, Subscription, SubscriptionPlan, WebhookLog } = require("../../models");

describe("Webhook Integration Tests", () => {
    let testUser;
    let testSubscription;
    let webhookSecret = "test_webhook_secret";

    before(async () => {
        await sequelize.sync({ force: true });
        
        // Create test subscription plan
        const basicPlan = await SubscriptionPlan.create({
            name: "Basic",
            price: 9.99,
            notification_limit: 100,
            features: ["Basic notifications", "Email support"]
        });

        // Create test user
        testUser = await User.create({
            email: "test@example.com",
            password: "password123",
            shop_domain: "testshop.myshopify.com"
        });

        // Create test subscription
        testSubscription = await Subscription.create({
            userId: testUser.id,
            planId: basicPlan.id,
            status: "active",
            current_period_start: new Date(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            notifications_used: 0
        });
    });

    const generateHmac = (body, secret) => {
        return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
    };

    describe("POST /webhooks/shopify/orders/create", () => {
        it("should process valid Shopify order creation webhook", async () => {
            const orderData = {
                id: 123456789,
                order_number: "#1001",
                customer: {
                    first_name: "John",
                    last_name: "Doe",
                    email: "john@example.com"
                },
                total_price: "99.99",
                currency: "USD",
                created_at: new Date().toISOString()
            };

            const body = JSON.stringify(orderData);
            const hmac = generateHmac(body, webhookSecret);

            const res = await request(app)
                .post("/webhooks/shopify/orders/create")
                .set("X-Shopify-Hmac-Sha256", hmac)
                .set("X-Shopify-Shop-Domain", "testshop.myshopify.com")
                .set("X-Shopify-Topic", "orders/create")
                .set("Content-Type", "application/json")
                .send(orderData);

            expect(res.statusCode).to.equal(200);
            
            // Check if webhook log was created
            const webhookLog = await WebhookLog.findOne({
                where: { 
                    shop_domain: "testshop.myshopify.com",
                    topic: "orders/create"
                }
            });
            expect(webhookLog).to.exist;
            expect(webhookLog.status).to.equal("processed");
        });

        it("should reject webhook with invalid HMAC", async () => {
            const orderData = {
                id: 123456790,
                order_number: "#1002",
                customer: {
                    first_name: "Jane",
                    last_name: "Smith",
                    email: "jane@example.com"
                },
                total_price: "149.99",
                currency: "USD"
            };

            const body = JSON.stringify(orderData);
            const invalidHmac = "invalid_hmac_signature";

            const res = await request(app)
                .post("/webhooks/shopify/orders/create")
                .set("X-Shopify-Hmac-Sha256", invalidHmac)
                .set("X-Shopify-Shop-Domain", "testshop.myshopify.com")
                .set("X-Shopify-Topic", "orders/create")
                .set("Content-Type", "application/json")
                .send(orderData);

            expect(res.statusCode).to.equal(400);
        });

        it("should handle webhook for non-existent shop", async () => {
            const orderData = {
                id: 123456791,
                order_number: "#1003",
                customer: {
                    first_name: "Bob",
                    last_name: "Johnson",
                    email: "bob@example.com"
                },
                total_price: "79.99",
                currency: "USD"
            };

            const body = JSON.stringify(orderData);
            const hmac = generateHmac(body, webhookSecret);

            const res = await request(app)
                .post("/webhooks/shopify/orders/create")
                .set("X-Shopify-Hmac-Sha256", hmac)
                .set("X-Shopify-Shop-Domain", "nonexistent.myshopify.com")
                .set("X-Shopify-Topic", "orders/create")
                .set("Content-Type", "application/json")
                .send(orderData);

            expect(res.statusCode).to.equal(404);
        });
    });

    describe("POST /webhooks/shopify/orders/paid", () => {
        it("should process order paid webhook", async () => {
            const orderData = {
                id: 123456792,
                order_number: "#1004",
                customer: {
                    first_name: "Alice",
                    last_name: "Brown",
                    email: "alice@example.com"
                },
                total_price: "199.99",
                currency: "USD",
                financial_status: "paid"
            };

            const body = JSON.stringify(orderData);
            const hmac = generateHmac(body, webhookSecret);

            const res = await request(app)
                .post("/webhooks/shopify/orders/paid")
                .set("X-Shopify-Hmac-Sha256", hmac)
                .set("X-Shopify-Shop-Domain", "testshop.myshopify.com")
                .set("X-Shopify-Topic", "orders/paid")
                .set("Content-Type", "application/json")
                .send(orderData);

            expect(res.statusCode).to.equal(200);
        });
    });

    describe("POST /webhooks/shopify/orders/fulfilled", () => {
        it("should process order fulfilled webhook", async () => {
            const orderData = {
                id: 123456793,
                order_number: "#1005",
                customer: {
                    first_name: "Charlie",
                    last_name: "Wilson",
                    email: "charlie@example.com"
                },
                total_price: "299.99",
                currency: "USD",
                fulfillment_status: "fulfilled",
                tracking_number: "TRK123456789"
            };

            const body = JSON.stringify(orderData);
            const hmac = generateHmac(body, webhookSecret);

            const res = await request(app)
                .post("/webhooks/shopify/orders/fulfilled")
                .set("X-Shopify-Hmac-Sha256", hmac)
                .set("X-Shopify-Shop-Domain", "testshop.myshopify.com")
                .set("X-Shopify-Topic", "orders/fulfilled")
                .set("Content-Type", "application/json")
                .send(orderData);

            expect(res.statusCode).to.equal(200);
        });
    });

    after(async () => {
        await sequelize.close();
    });
}); 