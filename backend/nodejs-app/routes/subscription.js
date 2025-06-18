const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const { auth } = require("../middleware/auth");

// Subscription management page
router.get("/", auth, subscriptionController.getSubscriptionPage);

// View available plans
router.get("/plans", auth, subscriptionController.getPlans);

// Upgrade/change subscription
router.post("/change-plan", auth, subscriptionController.changePlan);

// Cancel subscription
router.post("/cancel", auth, subscriptionController.cancelSubscription);

// Usage analytics
router.get("/usage", auth, subscriptionController.getUsageAnalytics);

// Billing history
router.get("/billing", auth, subscriptionController.getBillingHistory);

module.exports = router;

