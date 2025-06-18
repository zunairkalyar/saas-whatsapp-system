const { User, Subscription, SubscriptionPlan, AdminUser, Message, Order, WebhookLog, WhatsAppSession, UsageAnalytics, SystemSettings } = require("../models");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");

// Admin Authentication
exports.showLogin = (req, res) => {
    if (req.session && req.session.admin) {
        return res.redirect("/admin");
    }
    
    res.render("pages/admin/login", {
        title: "Admin Login",
        layout: "layouts/admin-auth",
        error: req.query.error,
        message: req.flash("message"),
        errors: req.flash("error")
    });
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            req.flash("error", "Email and password are required");
            return res.redirect("/admin/login");
        }
        
        // Find admin user
        const admin = await AdminUser.findOne({
            where: { 
                email: email.toLowerCase(),
                is_active: true
            }
        });
        
        if (!admin) {
            req.flash("error", "Invalid credentials");
            return res.redirect("/admin/login");
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        if (!isValidPassword) {
            req.flash("error", "Invalid credentials");
            return res.redirect("/admin/login");
        }
        
        // Update last login
        await admin.update({ last_login: new Date() });
        
        // Create admin session
        req.session.admin = {
            id: admin.id,
            email: admin.email,
            firstName: admin.first_name,
            lastName: admin.last_name,
            role: admin.role,
            permissions: admin.permissions,
            loginTime: Date.now(),
            lastActivity: new Date()
        };
        
        // Redirect to intended page or dashboard
        const returnTo = req.session.returnTo || "/admin";
        delete req.session.returnTo;
        
        req.flash("message", `Welcome back, ${admin.first_name}!`);
        res.redirect(returnTo);
        
    } catch (error) {
        console.error("Admin login error:", error);
        req.flash("error", "Login failed. Please try again.");
        res.redirect("/admin/login");
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Admin logout error:", err);
        }
        res.redirect("/admin/login");
    });
};

// Dashboard
exports.dashboard = async (req, res) => {
    try {
        // Get dashboard statistics
        const stats = await getDashboardStats();
        
        res.render("pages/admin/dashboard", {
            title: "Admin Dashboard",
            layout: "layouts/admin",
            admin: req.admin,
            stats,
            messages: req.flash("message"),
            errors: req.flash("error")
        });
        
    } catch (error) {
        console.error("Error loading admin dashboard:", error);
        req.flash("error", "Error loading dashboard");
        res.redirect("/admin/login");
    }
};

// User Management
exports.getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const search = req.query.search || "";
        const status = req.query.status || "";
        
        const offset = (page - 1) * limit;
        
        // Build where clause
        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { email: { [Op.iLike]: `%${search}%` } },
                { first_name: { [Op.iLike]: `%${search}%` } },
                { last_name: { [Op.iLike]: `%${search}%` } },
                { shop_domain: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (status) {
            whereClause.account_status = status;
        }
        
        const { count, rows: users } = await User.findAndCountAll({
            where: whereClause,
            include: [{
                model: Subscription,
                as: "subscription",
                include: [{
                    model: SubscriptionPlan,
                    as: "plan"
                }]
            }],
            order: [["created_at", "DESC"]],
            limit,
            offset
        });
        
        const totalPages = Math.ceil(count / limit);
        
        res.render("pages/admin/users", {
            title: "User Management",
            layout: "layouts/admin",
            admin: req.admin,
            users,
            currentPage: page,
            totalPages,
            totalUsers: count,
            search,
            status,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            messages: req.flash("message"),
            errors: req.flash("error")
        });
        
    } catch (error) {
        console.error("Error fetching users:", error);
        req.flash("error", "Error fetching users");
        res.redirect("/admin");
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const userId = req.params.id;
        
        const user = await User.findByPk(userId, {
            include: [
                {
                    model: Subscription,
                    as: "subscription",
                    include: [{
                        model: SubscriptionPlan,
                        as: "plan"
                    }]
                },
                {
                    model: WhatsAppSession,
                    as: "whatsappSession"
                }
            ]
        });
        
        if (!user) {
            req.flash("error", "User not found");
            return res.redirect("/admin/users");
        }
        
        // Get user's recent messages
        const recentMessages = await Message.findAll({
            where: { user_id: userId },
            order: [["created_at", "DESC"]],
            limit: 10
        });
        
        // Get user's recent orders
        const recentOrders = await Order.findAll({
            where: { user_id: userId },
            order: [["created_at", "DESC"]],
            limit: 10
        });
        
        // Get usage statistics
        const usageStats = await getUserUsageStats(userId);
        
        res.render("pages/admin/user-details", {
            title: `User Details - ${user.email}`,
            layout: "layouts/admin",
            admin: req.admin,
            user,
            recentMessages,
            recentOrders,
            usageStats,
            messages: req.flash("message"),
            errors: req.flash("error")
        });
        
    } catch (error) {
        console.error("Error fetching user details:", error);
        req.flash("error", "Error fetching user details");
        res.redirect("/admin/users");
    }
};

exports.suspendUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { reason } = req.body;
        
        const user = await User.findByPk(userId);
        if (!user) {
            req.flash("error", "User not found");
            return res.redirect("/admin/users");
        }
        
        await user.update({
            account_status: "suspended",
            // You might want to add a suspension_reason field
        });
        
        req.flash("message", `User ${user.email} has been suspended`);
        res.redirect(`/admin/users/${userId}`);
        
    } catch (error) {
        console.error("Error suspending user:", error);
        req.flash("error", "Error suspending user");
        res.redirect("/admin/users");
    }
};

exports.activateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        
        const user = await User.findByPk(userId);
        if (!user) {
            req.flash("error", "User not found");
            return res.redirect("/admin/users");
        }
        
        await user.update({
            account_status: "active"
        });
        
        req.flash("message", `User ${user.email} has been activated`);
        res.redirect(`/admin/users/${userId}`);
        
    } catch (error) {
        console.error("Error activating user:", error);
        req.flash("error", "Error activating user");
        res.redirect("/admin/users");
    }
};

exports.resetUserPassword = async (req, res) => {
    try {
        const userId = req.params.id;
        const newPassword = generateRandomPassword();
        
        const user = await User.findByPk(userId);
        if (!user) {
            req.flash("error", "User not found");
            return res.redirect("/admin/users");
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password_hash: hashedPassword });
        
        // In a real application, you would send this password via email
        req.flash("message", `Password reset for ${user.email}. New password: ${newPassword}`);
        res.redirect(`/admin/users/${userId}`);
        
    } catch (error) {
        console.error("Error resetting user password:", error);
        req.flash("error", "Error resetting user password");
        res.redirect("/admin/users");
    }
};

// Subscription Management
exports.getSubscriptions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const status = req.query.status || "";
        const planId = req.query.plan || "";
        
        const offset = (page - 1) * limit;
        
        // Build where clause
        const whereClause = {};
        if (status) {
            whereClause.status = status;
        }
        if (planId) {
            whereClause.plan_id = planId;
        }
        
        const { count, rows: subscriptions } = await Subscription.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: ["id", "email", "first_name", "last_name", "shop_domain"]
                },
                {
                    model: SubscriptionPlan,
                    as: "plan"
                }
            ],
            order: [["created_at", "DESC"]],
            limit,
            offset
        });
        
        // Get all plans for filter dropdown
        const plans = await SubscriptionPlan.findAll({
            where: { is_active: true },
            order: [["sort_order", "ASC"]]
        });
        
        const totalPages = Math.ceil(count / limit);
        
        res.render("pages/admin/subscriptions", {
            title: "Subscription Management",
            layout: "layouts/admin",
            admin: req.admin,
            subscriptions,
            plans,
            currentPage: page,
            totalPages,
            totalSubscriptions: count,
            status,
            planId,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            messages: req.flash("message"),
            errors: req.flash("error")
        });
        
    } catch (error) {
        console.error("Error fetching subscriptions:", error);
        req.flash("error", "Error fetching subscriptions");
        res.redirect("/admin");
    }
};

// Helper functions
async function getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const [
        totalUsers,
        activeUsers,
        totalSubscriptions,
        activeSubscriptions,
        totalMessages,
        messagesThisMonth,
        messagesToday,
        totalRevenue
    ] = await Promise.all([
        User.count(),
        User.count({ where: { account_status: "active" } }),
        Subscription.count(),
        Subscription.count({ where: { status: "active" } }),
        Message.count(),
        Message.count({ where: { created_at: { [Op.gte]: startOfMonth } } }),
        Message.count({ where: { created_at: { [Op.gte]: startOfDay } } }),
        // Calculate total revenue (this would need to be implemented based on your billing system)
        0
    ]);
    
    return {
        totalUsers,
        activeUsers,
        totalSubscriptions,
        activeSubscriptions,
        totalMessages,
        messagesThisMonth,
        messagesToday,
        totalRevenue
    };
}

async function getUserUsageStats(userId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [
        totalMessages,
        messagesThisMonth,
        totalOrders,
        ordersThisMonth
    ] = await Promise.all([
        Message.count({ where: { user_id: userId } }),
        Message.count({ 
            where: { 
                user_id: userId,
                created_at: { [Op.gte]: startOfMonth }
            }
        }),
        Order.count({ where: { user_id: userId } }),
        Order.count({ 
            where: { 
                user_id: userId,
                created_at: { [Op.gte]: startOfMonth }
            }
        })
    ]);
    
    return {
        totalMessages,
        messagesThisMonth,
        totalOrders,
        ordersThisMonth
    };
}

function generateRandomPassword(length = 12) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// Placeholder implementations for remaining methods
exports.getSubscriptionDetails = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin/subscriptions");
};

exports.changeSubscriptionPlan = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin/subscriptions");
};

exports.resetSubscriptionUsage = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin/subscriptions");
};

exports.getPlans = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.showCreatePlan = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.createPlan = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.showEditPlan = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.updatePlan = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.togglePlanStatus = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.getAnalytics = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.getUsageReport = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.getRevenueReport = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.getSystemStatus = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.getWebhookLogs = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.getMessageLogs = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.getSettings = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.updateSettings = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.getAdminUsers = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.showCreateAdmin = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.createAdmin = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

exports.toggleAdminStatus = async (req, res) => {
    req.flash("message", "Feature coming soon");
    res.redirect("/admin");
};

