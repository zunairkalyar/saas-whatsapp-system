const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Message = sequelize.define("Message", {
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
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "orders",
            key: "id",
        },
        onDelete: "SET NULL",
    },
    recipient_phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
    },
    message_content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    message_type: {
        type: DataTypes.ENUM("text", "image", "document", "audio", "video"),
        defaultValue: "text",
        allowNull: false,
    },
    template_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    template_variables: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    sent_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    },
    delivery_status: {
        type: DataTypes.ENUM("pending", "sent", "delivered", "read", "failed"),
        defaultValue: "pending",
        allowNull: false,
    },
    delivery_timestamp: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    retry_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    whatsapp_message_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
}, {
    tableName: "messages",
    indexes: [
        { fields: ["user_id"] },
        { fields: ["order_id"] },
        { fields: ["recipient_phone"] },
        { fields: ["delivery_status"] },
        { fields: ["sent_at"] },
    ],
});

// Instance methods
Message.prototype.markAsSent = async function() {
    this.delivery_status = 'sent';
    this.delivery_timestamp = new Date();
    await this.save();
};

Message.prototype.markAsDelivered = async function() {
    this.delivery_status = 'delivered';
    this.delivery_timestamp = new Date();
    await this.save();
};

Message.prototype.markAsRead = async function() {
    this.delivery_status = 'read';
    this.delivery_timestamp = new Date();
    await this.save();
};

Message.prototype.markAsFailed = async function(errorMessage) {
    this.delivery_status = 'failed';
    this.error_message = errorMessage;
    this.delivery_timestamp = new Date();
    await this.save();
};

Message.prototype.incrementRetryCount = async function() {
    this.retry_count += 1;
    await this.save();
};

Message.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
};

// Class methods
Message.findPendingMessages = function() {
    return this.findAll({ where: { delivery_status: 'pending' } });
};

Message.findFailedMessages = function() {
    return this.findAll({ where: { delivery_status: 'failed' } });
};

Message.countSentMessagesForUser = function(userId) {
    const { Op } = require('sequelize');
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return this.count({
        where: {
            user_id: userId,
            delivery_status: { [Op.in]: ['sent', 'delivered', 'read'] },
            sent_at: { [Op.gte]: startOfMonth }
        }
    });
};

module.exports = Message;


