const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const UsageAnalytics = sequelize.define("UsageAnalytics", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "users",
            key: "id",
        },
        onDelete: "CASCADE",
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    messages_sent: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    messages_delivered: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    messages_failed: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    webhooks_received: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    webhooks_processed: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
}, {
    tableName: "usage_analytics",
    indexes: [
        { fields: ["user_id"] },
        { fields: ["date"] },
        {
            fields: ["user_id", "date"],
            unique: true,
            name: "idx_usage_analytics_user_date_unique",
        },
    ],
});

// Instance methods
UsageAnalytics.prototype.incrementMessagesSent = async function(count = 1) {
    this.messages_sent += count;
    await this.save();
};

UsageAnalytics.prototype.incrementMessagesDelivered = async function(count = 1) {
    this.messages_delivered += count;
    await this.save();
};

UsageAnalytics.prototype.incrementMessagesFailed = async function(count = 1) {
    this.messages_failed += count;
    await this.save();
};

UsageAnalytics.prototype.incrementWebhooksReceived = async function(count = 1) {
    this.webhooks_received += count;
    await this.save();
};

UsageAnalytics.prototype.incrementWebhooksProcessed = async function(count = 1) {
    this.webhooks_processed += count;
    await this.save();
};

UsageAnalytics.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
};

// Class methods
UsageAnalytics.findOrCreateDailyEntry = async function(userId, date = new Date()) {
    const [entry, created] = await this.findOrCreate({
        where: {
            user_id: userId,
            date: date.toISOString().split("T")[0] // YYYY-MM-DD
        },
        defaults: {
            user_id: userId,
            date: date.toISOString().split("T")[0]
        }
    });
    return entry;
};

UsageAnalytics.getMonthlySummary = async function(userId, year, month) {
    const { Op } = require("sequelize");
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month

    const summary = await this.findAll({
        attributes: [
            [sequelize.fn("SUM", sequelize.col("messages_sent")), "total_messages_sent"],
            [sequelize.fn("SUM", sequelize.col("messages_delivered")), "total_messages_delivered"],
            [sequelize.fn("SUM", sequelize.col("messages_failed")), "total_messages_failed"],
            [sequelize.fn("SUM", sequelize.col("webhooks_received")), "total_webhooks_received"],
            [sequelize.fn("SUM", sequelize.col("webhooks_processed")), "total_webhooks_processed"],
        ],
        where: {
            user_id: userId,
            date: {
                [Op.between]: [startDate.toISOString().split("T")[0], endDate.toISOString().split("T")[0]],
            },
        },
        raw: true,
    });

    return summary[0] || {};
};

module.exports = UsageAnalytics;


