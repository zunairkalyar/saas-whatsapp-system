const { expect } = require("chai");
const { Subscription, SubscriptionPlan, User, setupAssociations } = require("../../models");
const { sequelize } = require("../../config/database");

describe("Subscription Model Unit Tests", () => {
    let user;
    let basicPlan;
    let proPlan;

    before(async () => {
        await sequelize.sync({ force: true });
        setupAssociations(); // Call setupAssociations here first

        // Create a user for subscriptions
        user = await User.create({
            email: "subuser@example.com",
            password_hash: "hashedpassword",
            first_name: "Sub",
            last_name: "User",
            account_status: "active",
            shop_domain: "subuser.myshopify.com"
        });

        // Create subscription plans
        basicPlan = await SubscriptionPlan.create({
            name: "Basic",
            description: "Basic plan with limited messages",
            monthly_price: 10.00,
            monthly_limit: 1000, // Changed from message_limit to monthly_limit
            features: ["basic_support"]
        });

        proPlan = await SubscriptionPlan.create({
            name: "Pro",
            description: "Pro plan with more messages",
            monthly_price: 50.00,
            monthly_limit: 5000, // Changed from message_limit to monthly_limit
            features: ["priority_support", "custom_templates"]
        });

        console.log("Basic Plan Monthly Limit:", basicPlan.monthly_limit);
        console.log("Pro Plan Monthly Limit:", proPlan.monthly_limit);
    });

    afterEach(async () => {
        await Subscription.destroy({ truncate: true, cascade: true });
    });

    it("should create a new subscription successfully", async () => {
        console.log("Creating subscription with monthly_limit:", basicPlan.monthly_limit);
        const subscription = await Subscription.create({
            user_id: user.id,
            plan_id: basicPlan.id,
            status: "active",
            start_date: new Date(),
            billing_cycle_end: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            current_usage: 0,
            monthly_limit: basicPlan.monthly_limit
        });

        expect(subscription).to.exist;
        expect(subscription.user_id).to.equal(user.id);
        expect(subscription.plan_id).to.equal(basicPlan.id);
        expect(subscription.status).to.equal("active");
    });

    it("should update current message count", async () => {
        console.log("Updating subscription with monthly_limit:", basicPlan.monthly_limit);
        const subscription = await Subscription.create({
            user_id: user.id,
            plan_id: basicPlan.id,
            status: "active",
            start_date: new Date(),
            billing_cycle_end: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            current_usage: 0,
            monthly_limit: basicPlan.monthly_limit
        });

        await subscription.increment("current_usage", { by: 50 });
        await subscription.reload();

        expect(subscription.current_usage).to.equal(50);
    });

    it("should check if message limit is exceeded", async () => {
        console.log("Checking message limit with monthly_limit:", basicPlan.monthly_limit);
        const subscription = await Subscription.create({
            user_id: user.id,
            plan_id: basicPlan.id,
            status: "active",
            start_date: new Date(),
            billing_cycle_end: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            current_usage: basicPlan.monthly_limit - 10,
            monthly_limit: basicPlan.monthly_limit
        });

        let isExceeded = await subscription.hasReachedLimit();
        expect(isExceeded).to.be.false;

        await subscription.increment("current_usage", { by: 20 });
        await subscription.reload();

        isExceeded = await subscription.hasReachedLimit();
        expect(isExceeded).to.be.true;
    });

    it("should associate with a user and a plan", async () => {
        console.log("Associating with user and plan with monthly_limit:", proPlan.monthly_limit);
        const subscription = await Subscription.create({
            user_id: user.id,
            plan_id: proPlan.id,
            status: "active",
            start_date: new Date(),
            billing_cycle_end: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            current_usage: 0,
            monthly_limit: proPlan.monthly_limit
        });

        const associatedUser = await subscription.getUser();
        const associatedPlan = await subscription.getPlan(); // Changed from getSubscriptionPlan to getPlan

        expect(associatedUser.id).to.equal(user.id);
        expect(associatedPlan.id).to.equal(proPlan.id);
    });
});

