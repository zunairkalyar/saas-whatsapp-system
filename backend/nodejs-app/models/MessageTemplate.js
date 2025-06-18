const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const MessageTemplate = sequelize.define("MessageTemplate", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // NULL for default system templates
        references: {
            model: "users",
            key: "id",
        },
        onDelete: "CASCADE",
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    event_type: {
        type: DataTypes.ENUM("order_created", "order_paid", "order_fulfilled", "order_cancelled", "order_updated"),
        allowNull: false,
    },
    template_content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    variables: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
}, {
    tableName: "message_templates",
    indexes: [
        { fields: ["user_id"] },
        { fields: ["event_type"] },
        {
            fields: ["user_id", "event_type", "name"],
            unique: true,
            name: "idx_message_templates_user_event_unique",
        },
    ],
});

// Instance methods
MessageTemplate.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
};

// Class methods
MessageTemplate.findByEventType = function(eventType, userId = null) {
    const whereClause = { event_type: eventType, is_active: true };
    if (userId) {
        whereClause.user_id = userId;
    } else {
        whereClause.is_default = true; // Only default templates if no user_id
    }
    return this.findOne({ where: whereClause });
};

MessageTemplate.findUserTemplates = function(userId) {
    return this.findAll({ where: { user_id: userId } });
};

MessageTemplate.findDefaultTemplates = function() {
    return this.findAll({ where: { is_default: true } });
};

module.exports = MessageTemplate;


