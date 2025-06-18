const { User, Subscription, Order, Message, UsageAnalytics } = require("../models");

exports.getDashboard = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findByPk(userId, {
            include: [Subscription]
        });

        if (!user) {
            req.flash("error", "User not found.");
            return res.redirect("/login");
        }

        // Fetch dashboard data
        const totalOrders = await Order.count({ where: { user_id: userId } });
        const totalMessagesSent = await Message.count({ where: { user_id: userId, delivery_status: "sent" } });
        const totalWebhooksReceived = await UsageAnalytics.sum("webhooks_received", { where: { user_id: userId } }) || 0;

        // Get current month's usage
        const currentMonthUsage = await Message.countSentMessagesForUser(userId);
        
        res.render("pages/dashboard/index", {
            title: "Dashboard",
            layout: "layouts/main",
            user: user.toJSON(),
            subscription: user.subscription ? user.subscription.toJSON() : null,
            totalOrders,
            totalMessagesSent,
            totalWebhooksReceived,
            currentMonthUsage,
            remainingMessages: user.subscription ? user.subscription.monthly_limit - currentMonthUsage : 0
        });
    } catch (err) {
        console.error("Error fetching dashboard data:", err);
        next(err);
    }
};


