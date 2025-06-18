const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { adminAuth, requireRole } = require("../middleware/adminAuth");

// Admin authentication routes
router.get("/login", adminController.showLogin);
router.post("/login", adminController.login);
router.post("/logout", adminAuth, adminController.logout);

// Admin dashboard routes (require admin authentication)
router.get("/", adminAuth, adminController.dashboard);

// User management routes
router.get("/users", adminAuth, requireRole(["admin", "super_admin"]), adminController.getUsers);
router.get("/users/:id", adminAuth, requireRole(["admin", "super_admin"]), adminController.getUserDetails);
router.post("/users/:id/suspend", adminAuth, requireRole(["admin", "super_admin"]), adminController.suspendUser);
router.post("/users/:id/activate", adminAuth, requireRole(["admin", "super_admin"]), adminController.activateUser);
router.post("/users/:id/reset-password", adminAuth, requireRole(["super_admin"]), adminController.resetUserPassword);

// Subscription management routes
router.get("/subscriptions", adminAuth, requireRole(["admin", "super_admin"]), adminController.getSubscriptions);
router.get("/subscriptions/:id", adminAuth, requireRole(["admin", "super_admin"]), adminController.getSubscriptionDetails);
router.post("/subscriptions/:id/change-plan", adminAuth, requireRole(["admin", "super_admin"]), adminController.changeSubscriptionPlan);
router.post("/subscriptions/:id/reset-usage", adminAuth, requireRole(["super_admin"]), adminController.resetSubscriptionUsage);

// Subscription plans management
router.get("/plans", adminAuth, requireRole(["admin", "super_admin"]), adminController.getPlans);
router.get("/plans/new", adminAuth, requireRole(["super_admin"]), adminController.showCreatePlan);
router.post("/plans", adminAuth, requireRole(["super_admin"]), adminController.createPlan);
router.get("/plans/:id/edit", adminAuth, requireRole(["super_admin"]), adminController.showEditPlan);
router.post("/plans/:id", adminAuth, requireRole(["super_admin"]), adminController.updatePlan);
router.post("/plans/:id/toggle", adminAuth, requireRole(["super_admin"]), adminController.togglePlanStatus);

// Analytics and reports
router.get("/analytics", adminAuth, requireRole(["admin", "super_admin"]), adminController.getAnalytics);
router.get("/reports/usage", adminAuth, requireRole(["admin", "super_admin"]), adminController.getUsageReport);
router.get("/reports/revenue", adminAuth, requireRole(["super_admin"]), adminController.getRevenueReport);

// System monitoring
router.get("/system", adminAuth, requireRole(["admin", "super_admin"]), adminController.getSystemStatus);
router.get("/webhooks", adminAuth, requireRole(["admin", "super_admin"]), adminController.getWebhookLogs);
router.get("/messages", adminAuth, requireRole(["admin", "super_admin"]), adminController.getMessageLogs);

// System settings
router.get("/settings", adminAuth, requireRole(["super_admin"]), adminController.getSettings);
router.post("/settings", adminAuth, requireRole(["super_admin"]), adminController.updateSettings);

// Admin user management
router.get("/admins", adminAuth, requireRole(["super_admin"]), adminController.getAdminUsers);
router.get("/admins/new", adminAuth, requireRole(["super_admin"]), adminController.showCreateAdmin);
router.post("/admins", adminAuth, requireRole(["super_admin"]), adminController.createAdmin);
router.post("/admins/:id/toggle", adminAuth, requireRole(["super_admin"]), adminController.toggleAdminStatus);

module.exports = router;

