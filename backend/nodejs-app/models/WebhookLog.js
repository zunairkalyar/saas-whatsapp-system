const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const WebhookLog = sequelize.define("WebhookLog", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Can be null if webhook is for system or unauthenticated
        references: {
            model: "users",
            key: "id",
        },
        onDelete: "SET NULL",
    },
    shop_domain: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    webhook_topic: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    shopify_order_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    payload: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
    headers: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    signature_valid: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    processing_status: {
        type: DataTypes.ENUM("pending", "processed", "failed", "ignored"),
        defaultValue: "pending",
        allowNull: false,
    },
    processing_time_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: "webhook_logs",
    indexes: [
        { fields: ["user_id"] },
        { fields: ["shop_domain"] },
        { fields: ["webhook_topic"] },
        { fields: ["processing_status"] },
        { fields: ["created_at"] },
    ],
});

// Instance methods
WebhookLog.prototype.markAsProcessed = async function(processingTimeMs = null) {
    this.processing_status = 'processed';
    this.processing_time_ms = processingTimeMs;
    await this.save();
};

WebhookLog.prototype.markAsFailed = async function(errorMessage, processingTimeMs = null) {
    this.processing_status = 'failed';
    this.error_message = errorMessage;
    this.processing_time_ms = processingTimeMs;
    await this.save();
};

WebhookLog.prototype.markAsIgnored = async function(reason = null) {
    this.processing_status = 'ignored';
    this.error_message = reason;
    await this.save();
};

WebhookLog.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
};

// Class methods
WebhookLog.findPending = function() {
    return this.findAll({ where: { processing_status: 'pending' } });
};

WebhookLog.findFailed = function() {
    return this.findAll({ where: { processing_status: 'failed' } });
};

WebhookLog.countByStatus = function(status) {
    return this.count({ where: { processing_status: status } });
};

WebhookLog.countByTopic = function(topic) {
    return this.count({ where: { webhook_topic: topic } });
};

module.exports = WebhookLog;


