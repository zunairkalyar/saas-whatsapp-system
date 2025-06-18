const request = require("supertest");
const { expect } = require("chai");
const app = require("../../app"); // Adjust path as needed
const { sequelize } = require("../../config/database");
const { User } = require("../../models");

describe("Authentication Integration Tests", () => {
    before(async () => {
        await sequelize.sync({ force: true }); // Clear and sync database for tests
    });

    it("should register a new user", async () => {
        const res = await request(app)
            .post("/register")
            .send({
                email: "test@example.com",
                password: "password123",
                shop_domain: "testshop.myshopify.com"
            });

        expect(res.statusCode).to.equal(302); // Expect redirect after successful registration
        expect(res.headers.location).to.equal("/dashboard");

        const user = await User.findOne({ where: { email: "test@example.com" } });
        expect(user).to.exist;
        expect(user.email).to.equal("test@example.com");
    });

    it("should not register a user with existing email", async () => {
        // User 'test@example.com' already registered from previous test
        const res = await request(app)
            .post("/register")
            .send({
                email: "test@example.com",
                password: "newpassword",
                shop_domain: "anothershop.myshopify.com"
            });

        expect(res.statusCode).to.equal(302); // Still redirects, but with error message
        expect(res.headers.location).to.equal("/register");
    });

    it("should log in an existing user", async () => {
        const res = await request(app)
            .post("/login")
            .send({
                email: "test@example.com",
                password: "password123"
            });

        expect(res.statusCode).to.equal(302); // Expect redirect after successful login
        expect(res.headers.location).to.equal("/dashboard");
    });

    it("should not log in with incorrect password", async () => {
        const res = await request(app)
            .post("/login")
            .send({
                email: "test@example.com",
                password: "wrongpassword"
            });

        expect(res.statusCode).to.equal(302); // Expect redirect back to login
        expect(res.headers.location).to.equal("/login");
    });

    it("should not log in with non-existent email", async () => {
        const res = await request(app)
            .post("/login")
            .send({
                email: "nonexistent@example.com",
                password: "password123"
            });

        expect(res.statusCode).to.equal(302); // Expect redirect back to login
        expect(res.headers.location).to.equal("/login");
    });
});

