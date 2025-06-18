const User = require('./User');
const Subscription = require('./Subscription');
const SubscriptionPlan = require('./SubscriptionPlan');
const Order = require('./Order');
const Message = require('./Message');
const WhatsAppSession = require('./WhatsAppSession');
const MessageTemplate = require('./MessageTemplate');
const WebhookLog = require('./WebhookLog');
const UsageAnalytics = require('./UsageAnalytics');
const AdminUser = require('./AdminUser');
const SystemSettings = require('./SystemSettings');
const Tenant = require('./Tenant');

// Define associations
function setupAssociations() {
    // Tenant associations
    Tenant.hasMany(User, {
        foreignKey: 'tenant_id',
        as: 'users',
        onDelete: 'CASCADE'
    });

    User.belongsTo(Tenant, {
        foreignKey: 'tenant_id',
        as: 'tenant'
    });

    // User associations
    User.hasOne(Subscription, { 
        foreignKey: 'user_id', 
        as: 'subscription',
        onDelete: 'CASCADE'
    });
    
    User.hasMany(Order, { 
        foreignKey: 'user_id', 
        as: 'orders',
        onDelete: 'CASCADE'
    });
    
    User.hasMany(Message, { 
        foreignKey: 'user_id', 
        as: 'messages',
        onDelete: 'CASCADE'
    });
    
    User.hasOne(WhatsAppSession, { 
        foreignKey: 'user_id', 
        as: 'whatsapp_session',
        onDelete: 'CASCADE'
    });
    
    User.hasMany(MessageTemplate, { 
        foreignKey: 'user_id', 
        as: 'message_templates',
        onDelete: 'CASCADE'
    });
    
    User.hasMany(UsageAnalytics, { 
        foreignKey: 'user_id', 
        as: 'usage_analytics',
        onDelete: 'CASCADE'
    });

    // Subscription associations
    Subscription.belongsTo(User, { 
        foreignKey: 'user_id', 
        as: 'user'
    });
    
    Subscription.belongsTo(SubscriptionPlan, { 
        foreignKey: 'plan_id', 
        as: 'plan'
    });

    // SubscriptionPlan associations
    SubscriptionPlan.hasMany(Subscription, { 
        foreignKey: 'plan_id', 
        as: 'subscriptions'
    });

    // Order associations
    Order.belongsTo(User, { 
        foreignKey: 'user_id', 
        as: 'user'
    });
    
    Order.hasMany(Message, { 
        foreignKey: 'order_id', 
        as: 'messages',
        onDelete: 'SET NULL'
    });

    // Message associations
    Message.belongsTo(User, { 
        foreignKey: 'user_id', 
        as: 'user'
    });
    
    Message.belongsTo(Order, { 
        foreignKey: 'order_id', 
        as: 'order'
    });
    
    Message.belongsTo(MessageTemplate, { 
        foreignKey: 'template_id', 
        as: 'template'
    });

    // WhatsApp Session associations
    WhatsAppSession.belongsTo(User, { 
        foreignKey: 'user_id', 
        as: 'user'
    });

    // Message Template associations
    MessageTemplate.belongsTo(User, { 
        foreignKey: 'user_id', 
        as: 'user'
    });
    
    MessageTemplate.hasMany(Message, { 
        foreignKey: 'template_id', 
        as: 'messages'
    });

    // Webhook Log associations
    WebhookLog.belongsTo(User, { 
        foreignKey: 'user_id', 
        as: 'user'
    });

    // Usage Analytics associations
    UsageAnalytics.belongsTo(User, { 
        foreignKey: 'user_id', 
        as: 'user'
    });

    console.log('✅ Model associations set up successfully');
}

module.exports = {
    User,
    Subscription,
    SubscriptionPlan,
    Order,
    Message,
    WhatsAppSession,
    MessageTemplate,
    WebhookLog,
    UsageAnalytics,
    AdminUser,
    SystemSettings,
    Tenant,
    setupAssociations
};

