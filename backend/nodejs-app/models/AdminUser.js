const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

const AdminUser = sequelize.define("AdminUser", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    first_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    last_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    role: {
        type: DataTypes.ENUM("super_admin", "admin", "support"),
        defaultValue: "admin",
        allowNull: false,
    },
    permissions: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: "admin_users",
    indexes: [
        { fields: ["email"] },
        { fields: ["role"] },
    ],
    hooks: {
        beforeCreate: async (adminUser) => {
            if (adminUser.password_hash && !adminUser.password_hash.startsWith("$2")) {
                adminUser.password_hash = await bcrypt.hash(adminUser.password_hash, 12);
            }
        },
        beforeUpdate: async (adminUser) => {
            if (adminUser.changed("password_hash") && !adminUser.password_hash.startsWith("$2")) {
                adminUser.password_hash = await bcrypt.hash(adminUser.password_hash, 12);
            }
        },
    },
});

// Instance methods
AdminUser.prototype.setPassword = async function(password) {
    this.password_hash = await bcrypt.hash(password, 12);
};

AdminUser.prototype.checkPassword = async function(password) {
    return await bcrypt.compare(password, this.password_hash);
};

AdminUser.prototype.updateLastLogin = async function() {
    this.last_login = new Date();
    await this.save();
};

AdminUser.prototype.getFullName = function() {
    if (this.first_name && this.last_name) {
        return `${this.first_name} ${this.last_name}`;
    }
    return this.first_name || this.last_name || this.email;
};

AdminUser.prototype.isActive = function() {
    return this.is_active;
};

AdminUser.prototype.hasPermission = function(permissionKey) {
    if (this.role === "super_admin") return true;
    if (!this.permissions) return false;

    const parts = permissionKey.split(".");
    let current = this.permissions;
    for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
            current = current[part];
        } else {
            return false;
        }
    }
    return current === true;
};

AdminUser.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password_hash; // Never expose password hash
    return values;
};

// Class methods
AdminUser.findByEmail = function(email) {
    return this.findOne({ where: { email } });
};

AdminUser.authenticate = async function(email, password) {
    const adminUser = await this.findByEmail(email);
    if (adminUser && await adminUser.checkPassword(password) && adminUser.isActive()) {
        await adminUser.updateLastLogin();
        return adminUser;
    }
    return null;
};

module.exports = AdminUser;


