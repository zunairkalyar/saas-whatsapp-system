const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SystemSettings = sequelize.define("SystemSettings", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    value: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    is_public: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
}, {
    tableName: "system_settings",
    indexes: [
        { fields: ["key"] },
    ],
});

// Instance methods
SystemSettings.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
};

// Class methods
SystemSettings.getSetting = async function(key) {
    const setting = await this.findOne({ where: { key } });
    return setting ? setting.value : null;
};

SystemSettings.setSetting = async function(key, value, description = null, isPublic = false) {
    const [setting, created] = await this.findOrCreate({
        where: { key },
        defaults: {
            key,
            value,
            description,
            is_public: isPublic,
        },
    });

    if (!created) {
        setting.value = value;
        if (description) setting.description = description;
        setting.is_public = isPublic;
        await setting.save();
    }
    return setting;
};

SystemSettings.getAllPublicSettings = function() {
    return this.findAll({ where: { is_public: true } });
};

module.exports = SystemSettings;


