const { User, Subscription, SubscriptionPlan, Message, UsageAnalytics } = require("../models");
const { Op } = require("sequelize");

exports.getSubscriptionPage = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        
        // Get user's current subscription with plan details
        const subscription = await Subscription.findByUserId(userId);
        
        // Get all available plans
        const availablePlans = await SubscriptionPlan.findActivePlans();
        
        // Get usage analytics for current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const monthlyUsage = await Message.count({
            where: {
                user_id: userId,
                created_at: {
                    [Op.gte]: startOfMonth
                },
                delivery_status: {
                    [Op.in]: ["sent", "delivered"]
                }
            }
        });
        
        res.render("pages/subscription/index", {
            title: "Subscription & Billing",
            layout: "layouts/main",
            subscription: subscription ? subscription.toJSON() : null,
            availablePlans,
            monthlyUsage,
            user: req.session.user
        });
    } catch (err) {
        console.error("Error loading subscription page:", err);
        next(err);
    }
};

exports.getPlans = async (req, res) => {
    try {
        const plans = await SubscriptionPlan.findActivePlans();
        
        res.json({
            success: true,
            plans: plans.map(plan => plan.toJSON())
        });
    } catch (error) {
        console.error("Error fetching plans:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.changePlan = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { planId } = req.body;
        
        if (!planId) {
            req.flash("error", "Please select a plan.");
            return res.redirect("/subscription");
        }
        
        // Get the new plan
        const newPlan = await SubscriptionPlan.findByPk(planId);
        if (!newPlan || !newPlan.is_active) {
            req.flash("error", "Invalid plan selected.");
            return res.redirect("/subscription");
        }
        
        // Get user's current subscription
        let subscription = await Subscription.findByUserId(userId);
        
        if (subscription) {
            // Update existing subscription
            await subscription.update({
                plan_id: newPlan.id,
                monthly_limit: newPlan.monthly_limit,
                status: "active"
            });
            
            console.log(`User ${userId} changed to plan: ${newPlan.name}`);
        } else {
            // Create new subscription
            const now = new Date();
            const billingCycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            
            subscription = await Subscription.create({
                user_id: userId,
                plan_id: newPlan.id,
                monthly_limit: newPlan.monthly_limit,
                billing_cycle_start: now,
                billing_cycle_end: billingCycleEnd,
                status: "active"
            });
            
            console.log(`User ${userId} subscribed to plan: ${newPlan.name}`);
        }
        
        req.flash("success_msg", `Successfully changed to ${newPlan.name} plan!`);
        res.redirect("/subscription");
        
    } catch (error) {
        console.error("Error changing plan:", error);
        req.flash("error", "An error occurred while changing your plan.");
        res.redirect("/subscription");
    }
};

exports.cancelSubscription = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { reason } = req.body;
        
        const subscription = await Subscription.findByUserId(userId);
        
        if (!subscription) {
            req.flash("error", "No active subscription found.");
            return res.redirect("/subscription");
        }
        
        await subscription.cancel(reason);
        
        console.log(`User ${userId} cancelled subscription. Reason: ${reason || "Not provided"}`);
        
        req.flash("success_msg", "Your subscription has been cancelled successfully.");
        res.redirect("/subscription");
        
    } catch (error) {
        console.error("Error cancelling subscription:", error);
        req.flash("error", "An error occurred while cancelling your subscription.");
        res.redirect("/subscription");
    }
};

exports.getUsageAnalytics = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { period = "month" } = req.query;
        
        let startDate, endDate;
        const now = new Date();
        
        switch (period) {
            case "week":
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                endDate = now;
                break;
            case "month":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
                break;
            case "year":
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = now;
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
        }
        
        // Get message counts by day
        const dailyUsage = await Message.findAll({
            attributes: [
                [sequelize.fn("DATE", sequelize.col("created_at")), "date"],
                [sequelize.fn("COUNT", sequelize.col("id")), "count"]
            ],
            where: {
                user_id: userId,
                created_at: {
                    [Op.between]: [startDate, endDate]
                },
                delivery_status: {
                    [Op.in]: ["sent", "delivered"]
                }
            },
            group: [sequelize.fn("DATE", sequelize.col("created_at"))],
            order: [[sequelize.fn("DATE", sequelize.col("created_at")), "ASC"]]
        });
        
        // Get total usage
        const totalUsage = await Message.count({
            where: {
                user_id: userId,
                created_at: {
                    [Op.between]: [startDate, endDate]
                },
                delivery_status: {
                    [Op.in]: ["sent", "delivered"]
                }
            }
        });
        
        res.json({
            success: true,
            period,
            startDate,
            endDate,
            totalUsage,
            dailyUsage: dailyUsage.map(item => ({
                date: item.getDataValue("date"),
                count: parseInt(item.getDataValue("count"))
            }))
        });
        
    } catch (error) {
        console.error("Error fetching usage analytics:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getBillingHistory = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Get subscription history (for now, just current subscription)
        const subscription = await Subscription.findByUserId(userId);
        
        const billingHistory = [];
        
        if (subscription) {
            billingHistory.push({
                date: subscription.billing_cycle_start,
                description: `${subscription.plan.name} Plan`,
                amount: subscription.plan.getFormattedPrice(),
                status: subscription.status,
                period: `${subscription.billing_cycle_start.toLocaleDateString()} - ${subscription.billing_cycle_end.toLocaleDateString()}`
            });
        }
        
        res.json({
            success: true,
            billingHistory
        });
        
    } catch (error) {
        console.error("Error fetching billing history:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

