const { expect } = require("chai");
const { User } = require("../../models/index.js");
const { sequelize } = require("../../config/database");

describe("User Model Unit Tests", () => {
    before(async () => {
        // Synchronize the database before running tests
        await sequelize.sync({ force: true }); 
    });

    afterEach(async () => {
        // Clean up after each test
        await User.destroy({ truncate: true, cascade: true });
    });

    it("should create a new user successfully", async () => {
        const userData = {
            email: "test@example.com",
            password_hash: "hashedpassword",
            first_name: "Test",
            last_name: "User",
            account_status: "active",
            shop_domain: "teststore.myshopify.com"
        };

        const user = await User.create(userData);

        expect(user).to.exist;
        expect(user.email).to.equal(userData.email);
        expect(user.account_status).to.equal("active");
    });

    it("should not create a user with duplicate email", async () => {
        const userData = {
            email: "duplicate@example.com",
            password_hash: "hashedpassword",
            first_name: "Duplicate",
            last_name: "User",
            account_status: "active",
            shop_domain: "duplicate.myshopify.com"
        };

        await User.create(userData);

        try {
            await User.create(userData);
            expect.fail("Expected SequelizeUniqueConstraintError but none was thrown");
        } catch (error) {
            expect(error.name).to.equal("SequelizeUniqueConstraintError");
        }
    });

    it("should find a user by email", async () => {
        const userData = {
            email: "findme@example.com",
            password_hash: "hashedpassword",
            first_name: "Find",
            last_name: "Me",
            account_status: "active",
            shop_domain: "findme.myshopify.com"
        };

        await User.create(userData);

        const foundUser = await User.findOne({ where: { email: userData.email } });

        expect(foundUser).to.exist;
        expect(foundUser.email).to.equal(userData.email);
    });
});

