const { sequelize } = require("../config/database");
const { SubscriptionPlan, Subscription, User, AdminUser } = require("../models");
const bcrypt = require("bcrypt");

async function seedSubscriptionPlans() {
    console.log("🌱 Seeding subscription plans...");
    
    const plans = [
        {
            name: "Free",
            description: "Perfect for testing and small stores",
            monthly_limit: 100,
            price_cents: 0,
            currency: "USD",
            features: [
                "100 messages per month",
                "Basic order notifications",
                "Email support"
            ],
            is_active: true,
            sort_order: 1
        },
        {
            name: "Starter",
            description: "Great for growing businesses",
            monthly_limit: 500,
            price_cents: 1999, // $19.99
            currency: "USD",
            features: [
                "500 messages per month",
                "All notification types",
                "Custom message templates",
                "Priority email support"
            ],
            is_active: true,
            sort_order: 2
        },
        {
            name: "Professional",
            description: "For established stores with high volume",
            monthly_limit: 2000,
            price_cents: 4999, // $49.99
            currency: "USD",
            features: [
                "2,000 messages per month",
                "All notification types",
                "Custom message templates",
                "Advanced analytics",
                "Priority support",
                "Multiple WhatsApp accounts"
            ],
            is_active: true,
            sort_order: 3
        },
        {
            name: "Enterprise",
            description: "For large businesses with custom needs",
            monthly_limit: 10000,
            price_cents: 14999, // $149.99
            currency: "USD",
            features: [
                "10,000 messages per month",
                "All notification types",
                "Custom message templates",
                "Advanced analytics",
                "24/7 priority support",
                "Multiple WhatsApp accounts",
                "Custom integrations",
                "Dedicated account manager"
            ],
            is_active: true,
            sort_order: 4
        }
    ];

    for (const planData of plans) {
        const [plan, created] = await SubscriptionPlan.findOrCreate({
            where: { name: planData.name },
            defaults: planData
        });
        
        if (created) {
            console.log(`✅ Created subscription plan: ${plan.name}`);
        } else {
            console.log(`⚠️  Subscription plan already exists: ${plan.name}`);
        }
    }
}

async function seedDefaultAdmin() {
    console.log("🌱 Seeding default admin user...");
    
    const adminData = {
        username: "admin",
        email: "admin@saaswhatsapp.com",
        password_hash: await bcrypt.hash("admin123", 10),
        full_name: "System Administrator",
        role: "super_admin",
        is_active: true,
        permissions: {
            users: ["read", "write", "delete"],
            subscriptions: ["read", "write", "delete"],
            analytics: ["read"],
            system: ["read", "write"]
        }
    };

    const [admin, created] = await AdminUser.findOrCreate({
        where: { email: adminData.email },
        defaults: adminData
    });
    
    if (created) {
        console.log(`✅ Created admin user: ${admin.email}`);
        console.log(`📧 Email: ${admin.email}`);
        console.log(`🔑 Password: admin123`);
    } else {
        console.log(`⚠️  Admin user already exists: ${admin.email}`);
    }
}

async function seedSystemSettings() {
    console.log("🌱 Seeding system settings...");
    
    const settings = [
        {
            key: "app_name",
            value: "SaaS WhatsApp Notifications",
            description: "Application name displayed in the interface",
            is_public: true
        },
        {
            key: "app_version",
            value: "1.0.0",
            description: "Current application version",
            is_public: true
        },
        {
            key: "max_message_length",
            value: 1000,
            description: "Maximum length for WhatsApp messages",
            is_public: false
        },
        {
            key: "default_plan_id",
            value: 1,
            description: "Default subscription plan ID for new users",
            is_public: false
        },
        {
            key: "trial_period_days",
            value: 14,
            description: "Number of days for trial period",
            is_public: false
        },
        {
            key: "webhook_timeout_seconds",
            value: 30,
            description: "Timeout for webhook processing",
            is_public: false
        },
        {
            key: "whatsapp_session_timeout_minutes",
            value: 60,
            description: "WhatsApp session timeout in minutes",
            is_public: false
        },
        {
            key: "enable_analytics",
            value: true,
            description: "Enable usage analytics collection",
            is_public: false
        }
    ];

    const { SystemSettings } = require("../models");
    
    for (const settingData of settings) {
        const [setting, created] = await SystemSettings.findOrCreate({
            where: { key: settingData.key },
            defaults: settingData
        });
        
        if (created) {
            console.log(`✅ Created system setting: ${setting.key}`);
        } else {
            console.log(`⚠️  System setting already exists: ${setting.key}`);
        }
    }
}

async function createDefaultSubscriptions() {
    console.log("🌱 Creating default subscriptions for existing users...");
    
    // Get the free plan
    const freePlan = await SubscriptionPlan.findOne({
        where: { name: "Free" }
    });
    
    if (!freePlan) {
        console.log("❌ Free plan not found, skipping default subscriptions");
        return;
    }
    
    // Find all users
    const users = await User.findAll();
    
    for (const user of users) {
        // Check if user already has a subscription
        const existingSubscription = await Subscription.findOne({
            where: { user_id: user.id }
        });
        
        if (!existingSubscription) {
            const now = new Date();
            const billingCycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            
            await Subscription.create({
                user_id: user.id,
                plan_id: freePlan.id,
                monthly_limit: freePlan.monthly_limit,
                billing_cycle_start: now,
                billing_cycle_end: billingCycleEnd,
                status: "active"
            });
            
            console.log(`✅ Created free subscription for user: ${user.email}`);
        } else {
            console.log(`⚠️  User ${user.email} already has a subscription`);
        }
    }
}

async function runSeeds() {
    try {
        console.log("🚀 Starting database seeding...");
        
        await seedSubscriptionPlans();
        await seedDefaultAdmin();
        await seedSystemSettings();
        await createDefaultSubscriptions();
        
        console.log("✅ Database seeding completed successfully!");
        
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        throw error;
    }
}

// Run seeds if this file is executed directly
if (require.main === module) {
    runSeeds()
        .then(() => {
            console.log("🎉 Seeding process completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("💥 Seeding process failed:", error);
            process.exit(1);
        });
}

module.exports = {
    seedSubscriptionPlans,
    seedDefaultAdmin,
    seedSystemSettings,
    createDefaultSubscriptions,
    runSeeds
};

