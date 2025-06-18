const { DataTypes, Op } = require("sequelize");
const { sequelize } = require("../config/database");

const Subscription = sequelize.define("Subscription", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "users",
            key: "id"
        },
        onDelete: "CASCADE"
    },
    plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "subscription_plans",
            key: "id"
        },
        onDelete: "RESTRICT"
    },
    status: {
        type: DataTypes.ENUM("active", "cancelled", "expired", "suspended"),
        allowNull: false,
        defaultValue: "active"
    },
    monthly_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Current monthly message limit (copied from plan for historical tracking)"
    },
    current_usage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Messages used in current billing period"
    },
    billing_cycle_start: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    billing_cycle_end: {
        type: DataTypes.DATE,
        allowNull: false
    },
    next_billing_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    stripe_subscription_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true
    },
    stripe_customer_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    last_payment_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    last_payment_amount_cents: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    trial_ends_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancellation_reason: {
        type: DataTypes.TEXT,
        allowNull: true
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
    tableName: "subscriptions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        {
            fields: ["user_id"],
            unique: true
        },
        {
            fields: ["status"]
        },
        {
            fields: ["billing_cycle_start", "billing_cycle_end"]
        },
        {
            fields: ["stripe_subscription_id"],
            unique: true,
            where: {
                stripe_subscription_id: {
                    [Op.ne]: null
                }
            }
        }
    ]
});

// Instance methods
Subscription.prototype.isActive = function() {
    return this.status === "active" && 
           (!this.trial_ends_at || this.trial_ends_at > new Date()) &&
           this.billing_cycle_end > new Date();
};

Subscription.prototype.hasReachedLimit = function() {
    return this.current_usage >= this.monthly_limit;
};

Subscription.prototype.getRemainingMessages = function() {
    return Math.max(0, this.monthly_limit - this.current_usage);
};

Subscription.prototype.getUsagePercentage = function() {
    if (this.monthly_limit === 0) return 0;
    return Math.min(100, (this.current_usage / this.monthly_limit) * 100);
};

Subscription.prototype.incrementUsage = async function(count = 1) {
    this.current_usage += count;
    await this.save();
    return this.current_usage;
};

Subscription.prototype.resetUsage = async function() {
    this.current_usage = 0;
    await this.save();
    return this;
};

Subscription.prototype.renewBillingCycle = async function() {
    const now = new Date();
    this.billing_cycle_start = now;
    this.billing_cycle_end = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    this.next_billing_date = this.billing_cycle_end;
    this.current_usage = 0;
    await this.save();
    return this;
};

Subscription.prototype.cancel = async function(reason = null) {
    this.status = "cancelled";
    this.cancelled_at = new Date();
    this.cancellation_reason = reason;
    await this.save();
    return this;
};

Subscription.prototype.getDaysUntilRenewal = function() {
    const now = new Date();
    const diffTime = this.billing_cycle_end - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Subscription.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    values.is_active = this.isActive();
    values.has_reached_limit = this.hasReachedLimit();
    values.remaining_messages = this.getRemainingMessages();
    values.usage_percentage = this.getUsagePercentage();
    values.days_until_renewal = this.getDaysUntilRenewal();
    return values;
};

// Class methods
Subscription.findByUserId = function(userId) {
    return this.findOne({
        where: { user_id: userId },
        include: [{
            model: require("./SubscriptionPlan"),
            as: "plan"
        }]
    });
};

Subscription.findActiveSubscriptions = function() {
    return this.findAll({
        where: { 
            status: "active",
            billing_cycle_end: {
                [Op.gt]: new Date()
            }
        },
        include: [{
            model: require("./User"),
            as: "user"
        }, {
            model: require("./SubscriptionPlan"),
            as: "plan"
        }]
    });
};

Subscription.findExpiredSubscriptions = function() {
    return this.findAll({
        where: {
            status: "active",
            billing_cycle_end: {
                [Op.lt]: new Date()
            }
        }
    });
};

module.exports = Subscription;

