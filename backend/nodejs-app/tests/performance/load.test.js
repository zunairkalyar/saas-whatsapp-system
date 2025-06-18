const request = require("supertest");
const { expect } = require("chai");
const crypto = require("crypto");
const app = require("../../app");
const { sequelize } = require("../../config/database");
const { User, Subscription, SubscriptionPlan } = require("../../models");

describe("Performance Tests", () => {
    let testUsers = [];
    let webhookSecret = "test_webhook_secret";

    before(async () => {
        await sequelize.sync({ force: true });
        
        // Create test subscription plan
        const basicPlan = await SubscriptionPlan.create({
            name: "Basic",
            price: 9.99,
            notification_limit: 1000,
            features: ["Basic notifications", "Email support"]
        });

        // Create multiple test users for load testing
        for (let i = 0; i < 10; i++) {
            const user = await User.create({
                email: `test${i}@example.com`,
                password: "password123",
                shop_domain: `testshop${i}.myshopify.com`
            });

            await Subscription.create({
                userId: user.id,
                planId: basicPlan.id,
                status: "active",
                current_period_start: new Date(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                notifications_used: 0
            });

            testUsers.push(user);
        }
    });

    const generateHmac = (body, secret) => {
        return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
    };

    describe("Webhook Processing Performance", () => {
        it("should handle 100 concurrent webhook requests", async () => {
            const startTime = Date.now();
            const concurrentRequests = 100;
            const promises = [];

            for (let i = 0; i < concurrentRequests; i++) {
                const userIndex = i % testUsers.length;
                const user = testUsers[userIndex];
                
                const orderData = {
                    id: 1000000 + i,
                    order_number: `#${1000 + i}`,
                    customer: {
                        first_name: `Customer${i}`,
                        last_name: `Test${i}`,
                        email: `customer${i}@example.com`
                    },
                    total_price: (Math.random() * 100 + 10).toFixed(2),
                    currency: "USD",
                    created_at: new Date().toISOString()
                };

                const body = JSON.stringify(orderData);
                const hmac = generateHmac(body, webhookSecret);

                const promise = request(app)
                    .post("/webhooks/shopify/orders/create")
                    .set("X-Shopify-Hmac-Sha256", hmac)
                    .set("X-Shopify-Shop-Domain", user.shop_domain)
                    .set("X-Shopify-Topic", "orders/create")
                    .set("Content-Type", "application/json")
                    .send(orderData);

                promises.push(promise);
            }

            const results = await Promise.all(promises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Check all requests were successful
            const successfulRequests = results.filter(res => res.statusCode === 200).length;
            expect(successfulRequests).to.be.at.least(95); // Allow 5% failure rate

            // Performance assertion - should complete within 10 seconds
            expect(totalTime).to.be.lessThan(10000);
            
            console.log(`Processed ${successfulRequests}/${concurrentRequests} requests in ${totalTime}ms`);
            console.log(`Average response time: ${totalTime / concurrentRequests}ms`);
        });

        it("should handle rapid sequential webhook requests", async () => {
            const startTime = Date.now();
            const sequentialRequests = 50;
            const user = testUsers[0];

            for (let i = 0; i < sequentialRequests; i++) {
                const orderData = {
                    id: 2000000 + i,
                    order_number: `#${2000 + i}`,
                    customer: {
                        first_name: `Sequential${i}`,
                        last_name: `Customer${i}`,
                        email: `sequential${i}@example.com`
                    },
                    total_price: (Math.random() * 100 + 10).toFixed(2),
                    currency: "USD",
                    created_at: new Date().toISOString()
                };

                const body = JSON.stringify(orderData);
                const hmac = generateHmac(body, webhookSecret);

                const res = await request(app)
                    .post("/webhooks/shopify/orders/create")
                    .set("X-Shopify-Hmac-Sha256", hmac)
                    .set("X-Shopify-Shop-Domain", user.shop_domain)
                    .set("X-Shopify-Topic", "orders/create")
                    .set("Content-Type", "application/json")
                    .send(orderData);

                expect(res.statusCode).to.equal(200);
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Performance assertion - should complete within 5 seconds
            expect(totalTime).to.be.lessThan(5000);
            
            console.log(`Processed ${sequentialRequests} sequential requests in ${totalTime}ms`);
            console.log(`Average response time: ${totalTime / sequentialRequests}ms`);
        });
    });

    describe("Database Performance", () => {
        it("should handle bulk user creation efficiently", async () => {
            const startTime = Date.now();
            const bulkUsers = [];

            for (let i = 0; i < 100; i++) {
                bulkUsers.push({
                    email: `bulk${i}@example.com`,
                    password: "password123",
                    shop_domain: `bulkshop${i}.myshopify.com`
                });
            }

            const createdUsers = await User.bulkCreate(bulkUsers);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            expect(createdUsers).to.have.length(100);
            expect(totalTime).to.be.lessThan(2000); // Should complete within 2 seconds

            console.log(`Created ${createdUsers.length} users in ${totalTime}ms`);
        });

        it("should handle complex queries efficiently", async () => {
            const startTime = Date.now();

            // Complex query with joins
            const usersWithSubscriptions = await User.findAll({
                include: [{
                    model: Subscription,
                    include: [SubscriptionPlan]
                }],
                where: {
                    email: {
                        [sequelize.Op.like]: 'test%@example.com'
                    }
                }
            });

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            expect(usersWithSubscriptions).to.have.length.at.least(10);
            expect(totalTime).to.be.lessThan(1000); // Should complete within 1 second

            console.log(`Complex query returned ${usersWithSubscriptions.length} results in ${totalTime}ms`);
        });
    });

    describe("Memory Usage", () => {
        it("should not have memory leaks during repeated operations", async () => {
            const initialMemory = process.memoryUsage();
            
            // Perform repeated operations
            for (let round = 0; round < 5; round++) {
                for (let i = 0; i < 20; i++) {
                    const user = testUsers[i % testUsers.length];
                    
                    const orderData = {
                        id: 3000000 + round * 20 + i,
                        order_number: `#${3000 + round * 20 + i}`,
                        customer: {
                            first_name: `Memory${round}${i}`,
                            last_name: `Test${round}${i}`,
                            email: `memory${round}${i}@example.com`
                        },
                        total_price: (Math.random() * 100 + 10).toFixed(2),
                        currency: "USD"
                    };

                    const body = JSON.stringify(orderData);
                    const hmac = generateHmac(body, webhookSecret);

                    await request(app)
                        .post("/webhooks/shopify/orders/create")
                        .set("X-Shopify-Hmac-Sha256", hmac)
                        .set("X-Shopify-Shop-Domain", user.shop_domain)
                        .set("X-Shopify-Topic", "orders/create")
                        .set("Content-Type", "application/json")
                        .send(orderData);
                }

                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            
            // Memory increase should be reasonable (less than 50MB)
            expect(memoryIncrease).to.be.lessThan(50 * 1024 * 1024);

            console.log(`Memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB -> ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
            console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
        });
    });

    after(async () => {
        await sequelize.close();
    });
}); 