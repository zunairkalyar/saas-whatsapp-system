const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const WhatsAppSession = sequelize.define("WhatsAppSession", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: "users",
            key: "id",
        },
        onDelete: "CASCADE",
    },
    device_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    session_data: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    auth_state: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    connection_status: {
        type: DataTypes.ENUM("connected", "disconnected", "connecting", "error"),
        defaultValue: "disconnected",
        allowNull: false,
    },
    qr_code: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    qr_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    last_connected: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    last_disconnected: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: "whatsapp_sessions",
    indexes: [
        { fields: ["user_id"] },
        { fields: ["connection_status"] },
    ],
});

// Instance methods
WhatsAppSession.prototype.markAsConnected = async function() {
    this.connection_status = 'connected';
    this.last_connected = new Date();
    this.qr_code = null;
    this.qr_expires_at = null;
    await this.save();
};

WhatsAppSession.prototype.markAsDisconnected = async function(errorMessage = null) {
    this.connection_status = 'disconnected';
    this.last_disconnected = new Date();
    this.error_message = errorMessage;
    await this.save();
};

WhatsAppSession.prototype.updateQrCode = async function(qrCode, expiryTime) {
    this.qr_code = qrCode;
    this.qr_expires_at = expiryTime;
    this.connection_status = 'connecting';
    await this.save();
};

WhatsAppSession.prototype.clearQrCode = async function() {
    this.qr_code = null;
    this.qr_expires_at = null;
    await this.save();
};

WhatsAppSession.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
};

// Class methods
WhatsAppSession.findByUserId = function(userId) {
    return this.findOne({ where: { user_id: userId } });
};

WhatsAppSession.findConnectedSessions = function() {
    return this.findAll({ where: { connection_status: 'connected' } });
};

WhatsAppSession.findDisconnectedSessions = function() {
    return this.findAll({ where: { connection_status: 'disconnected' } });
};

module.exports = WhatsAppSession;


