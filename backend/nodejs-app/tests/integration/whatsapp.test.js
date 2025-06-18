const request = require("supertest");
const { expect } = require("chai");
const app = require("../../app");
const { sequelize } = require("../../config/database");
const { User, Subscription, SubscriptionPlan, WhatsAppSession } = require("../../models");

describe("WhatsApp Integration Tests", () => {
    let testUser;
    let testSubscription;
    let session;

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

    describe("GET /whatsapp/qr", () => {
        it("should generate QR code for new session", async () => {
            const res = await request(app)
                .get("/whatsapp/qr")
                .set("Cookie", `user_id=${testUser.id}`);

            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property("qrCode");
            expect(res.body).to.have.property("sessionId");
            expect(res.body.qrCode).to.be.a("string");
            expect(res.body.sessionId).to.be.a("string");
        });

        it("should return existing session if already authenticated", async () => {
            // First request to create session
            await request(app)
                .get("/whatsapp/qr")
                .set("Cookie", `user_id=${testUser.id}`);

            // Second request should return existing session
            const res = await request(app)
                .get("/whatsapp/qr")
                .set("Cookie", `user_id=${testUser.id}`);

            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property("status");
            expect(res.body.status).to.equal("authenticated");
        });
    });

    describe("POST /whatsapp/send", () => {
        it("should send WhatsApp message when session is authenticated", async () => {
            // First create an authenticated session
            const qrRes = await request(app)
                .get("/whatsapp/qr")
                .set("Cookie", `user_id=${testUser.id}`);

            const sessionId = qrRes.body.sessionId;

            // Mock the session as authenticated
            await WhatsAppSession.update(
                { status: "authenticated", phone_number: "+1234567890" },
                { where: { id: sessionId } }
            );

            const messageData = {
                phone: "+1234567890",
                message: "Test message from integration test",
                sessionId: sessionId
            };

            const res = await request(app)
                .post("/whatsapp/send")
                .set("Cookie", `user_id=${testUser.id}`)
                .send(messageData);

            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property("success", true);
            expect(res.body).to.have.property("messageId");
        });

        it("should reject message when session is not authenticated", async () => {
            const messageData = {
                phone: "+1234567890",
                message: "Test message without authentication",
                sessionId: "invalid-session-id"
            };

            const res = await request(app)
                .post("/whatsapp/send")
                .set("Cookie", `user_id=${testUser.id}`)
                .send(messageData);

            expect(res.statusCode).to.equal(400);
            expect(res.body).to.have.property("error");
        });

        it("should reject message when subscription limit is exceeded", async () => {
            // Update subscription to exceed limit
            await testSubscription.update({ notifications_used: 100 });

            const messageData = {
                phone: "+1234567890",
                message: "Test message with exceeded limit",
                sessionId: "test-session-id"
            };

            const res = await request(app)
                .post("/whatsapp/send")
                .set("Cookie", `user_id=${testUser.id}`)
                .send(messageData);

            expect(res.statusCode).to.equal(403);
            expect(res.body).to.have.property("error");
            expect(res.body.error).to.include("subscription limit");
        });
    });

    describe("GET /whatsapp/status", () => {
        it("should return session status", async () => {
            const res = await request(app)
                .get("/whatsapp/status")
                .set("Cookie", `user_id=${testUser.id}`);

            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property("status");
            expect(res.body).to.have.property("phoneNumber");
            expect(res.body).to.have.property("lastSeen");
        });
    });

    describe("POST /whatsapp/logout", () => {
        it("should logout and clear session", async () => {
            const res = await request(app)
                .post("/whatsapp/logout")
                .set("Cookie", `user_id=${testUser.id}`);

            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property("success", true);

            // Verify session is cleared
            const session = await WhatsAppSession.findOne({
                where: { userId: testUser.id }
            });
            expect(session.status).to.equal("disconnected");
        });
    });

    after(async () => {
        await sequelize.close();
    });
}); 