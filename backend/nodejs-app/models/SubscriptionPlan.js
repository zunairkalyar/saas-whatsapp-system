const { DataTypes, Op } = require("sequelize");
const { sequelize } = require("../config/database");

const SubscriptionPlan = sequelize.define("SubscriptionPlan", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    monthly_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Number of messages allowed per month"
    },
    price_cents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Price in cents (e.g., 2999 = $29.99)"
    },
    currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "USD"
    },
    features: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "JSON array of plan features"
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Display order for plans"
    },
    stripe_price_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Stripe price ID for billing integration"
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: "subscription_plans",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        {
            fields: ["is_active", "sort_order"]
        },
        {
            fields: ["stripe_price_id"],
            unique: true,
            where: {
                stripe_price_id: {
                    [Op.ne]: null
                }
            }
        }
    ]
});

// Instance methods
SubscriptionPlan.prototype.getFormattedPrice = function() {
    const amount = this.price_cents / 100;
    const formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: this.currency
    });
    return formatter.format(amount);
};

SubscriptionPlan.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    values.formatted_price = this.getFormattedPrice();
    return values;
};

// Class methods
SubscriptionPlan.findActivePlans = function() {
    return this.findAll({
        where: { is_active: true },
        order: [["sort_order", "ASC"], ["price_cents", "ASC"]]
    });
};

SubscriptionPlan.findByStripeId = function(stripePriceId) {
    return this.findOne({
        where: { stripe_price_id: stripePriceId }
    });
};

SubscriptionPlan.getDefaultPlan = function() {
    return this.findOne({
        where: { 
            is_active: true,
            price_cents: 0 
        },
        order: [["sort_order", "ASC"]]
    });
};

module.exports = SubscriptionPlan;

