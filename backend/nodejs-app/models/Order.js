const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    shopify_order_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    order_number: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    customer_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    customer_phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    customer_first_name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    customer_last_name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    order_total_cents: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0
        }
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'USD',
        allowNull: false
    },
    order_status: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    financial_status: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    fulfillment_status: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    line_items_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    shipping_address: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    billing_address: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    line_items: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    tags: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    shopify_created_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    shopify_updated_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    webhook_received_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    processed_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'orders',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['shopify_order_id'] },
        { fields: ['customer_phone'] },
        { fields: ['order_status'] },
        { fields: ['webhook_received_at'] },
        { 
            fields: ['user_id', 'shopify_order_id'], 
            unique: true,
            name: 'idx_orders_user_shopify_unique'
        }
    ]
});

// Instance methods
Order.prototype.getCustomerFullName = function() {
    if (this.customer_first_name && this.customer_last_name) {
        return `${this.customer_first_name} ${this.customer_last_name}`;
    }
    return this.customer_first_name || this.customer_last_name || 'Customer';
};

Order.prototype.getOrderTotalDollars = function() {
    if (!this.order_total_cents) return 0;
    return this.order_total_cents / 100;
};

Order.prototype.getFormattedTotal = function() {
    const amount = this.getOrderTotalDollars();
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: this.currency || 'USD'
    }).format(amount);
};

Order.prototype.markAsProcessed = async function() {
    this.processed_at = new Date();
    await this.save();
};

Order.prototype.isProcessed = function() {
    return !!this.processed_at;
};

Order.prototype.getShippingAddressString = function() {
    if (!this.shipping_address) return '';
    
    const addr = this.shipping_address;
    const parts = [
        addr.address1,
        addr.address2,
        addr.city,
        addr.province,
        addr.zip,
        addr.country
    ].filter(Boolean);
    
    return parts.join(', ');
};

Order.prototype.hasValidPhoneNumber = function() {
    return this.customer_phone && 
           this.customer_phone.length >= 10 && 
           /^[\+]?[1-9][\d]{0,15}$/.test(this.customer_phone);
};

Order.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    
    // Add computed properties
    values.customer_full_name = this.getCustomerFullName();
    values.order_total_dollars = this.getOrderTotalDollars();
    values.formatted_total = this.getFormattedTotal();
    values.is_processed = this.isProcessed();
    values.shipping_address_string = this.getShippingAddressString();
    values.has_valid_phone = this.hasValidPhoneNumber();
    
    return values;
};

// Class methods
Order.findByShopifyOrderId = function(userId, shopifyOrderId) {
    return this.findOne({
        where: {
            user_id: userId,
            shopify_order_id: shopifyOrderId
        }
    });
};

Order.findUnprocessedOrders = function(userId = null) {
    const where = { processed_at: null };
    if (userId) {
        where.user_id = userId;
    }
    return this.findAll({ where });
};

Order.findRecentOrders = function(userId, limit = 10) {
    return this.findAll({
        where: { user_id: userId },
        order: [['webhook_received_at', 'DESC']],
        limit
    });
};

Order.findOrdersByStatus = function(userId, status) {
    return this.findAll({
        where: {
            user_id: userId,
            order_status: status
        },
        order: [['webhook_received_at', 'DESC']]
    });
};

Order.findOrdersByDateRange = function(userId, startDate, endDate) {
    const { Op } = require('sequelize');
    return this.findAll({
        where: {
            user_id: userId,
            webhook_received_at: {
                [Op.between]: [startDate, endDate]
            }
        },
        order: [['webhook_received_at', 'DESC']]
    });
};

Order.getOrderStats = async function(userId) {
    const { Op } = require('sequelize');
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const stats = await this.findAll({
        where: {
            user_id: userId,
            webhook_received_at: {
                [Op.gte]: startOfMonth
            }
        },
        attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'total_orders'],
            [sequelize.fn('SUM', sequelize.col('order_total_cents')), 'total_revenue_cents'],
            [sequelize.fn('COUNT', sequelize.literal('CASE WHEN processed_at IS NOT NULL THEN 1 END')), 'processed_orders']
        ],
        raw: true
    });
    
    const result = stats[0] || {};
    return {
        total_orders: parseInt(result.total_orders) || 0,
        total_revenue_cents: parseInt(result.total_revenue_cents) || 0,
        total_revenue_dollars: (parseInt(result.total_revenue_cents) || 0) / 100,
        processed_orders: parseInt(result.processed_orders) || 0,
        unprocessed_orders: (parseInt(result.total_orders) || 0) - (parseInt(result.processed_orders) || 0)
    };
};

module.exports = Order;

