const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    shop_domain: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isUrl: true
        }
    },
    whatsapp_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
            is: /^[\+]?[1-9][\d]{0,15}$/
        }
    },
    first_name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    last_name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    account_status: {
        type: DataTypes.ENUM('active', 'suspended', 'inactive'),
        defaultValue: 'active',
        allowNull: false
    },
    email_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    whatsapp_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true
    },
    timezone: {
        type: DataTypes.STRING(50),
        defaultValue: 'UTC',
        allowNull: false
    }
}, {
    tableName: 'users',
    indexes: [
        { fields: ['email'] },
        { fields: ['shop_domain'] },
        { fields: ['account_status'] }
    ],
    hooks: {
        beforeCreate: async (user) => {
            if (user.password_hash && !user.password_hash.startsWith('$2')) {
                user.password_hash = await bcrypt.hash(user.password_hash, 12);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password_hash') && !user.password_hash.startsWith('$2')) {
                user.password_hash = await bcrypt.hash(user.password_hash, 12);
            }
        }
    }
});

// Instance methods
User.prototype.setPassword = async function(password) {
    this.password_hash = await bcrypt.hash(password, 12);
};

User.prototype.checkPassword = async function(password) {
    return await bcrypt.compare(password, this.password_hash);
};

User.prototype.updateLastLogin = async function() {
    this.last_login = new Date();
    await this.save();
};

User.prototype.getFullName = function() {
    if (this.first_name && this.last_name) {
        return `${this.first_name} ${this.last_name}`;
    }
    return this.first_name || this.last_name || this.email;
};

User.prototype.isActive = function() {
    return this.account_status === 'active';
};

User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password_hash; // Never expose password hash
    return values;
};

// Class methods
User.findByEmail = function(email) {
    return this.findOne({ where: { email } });
};

User.findByShopDomain = function(shop_domain) {
    return this.findOne({ where: { shop_domain } });
};

User.findActiveUsers = function() {
    return this.findAll({ where: { account_status: 'active' } });
};

User.authenticate = async function(email, password) {
    const user = await this.findByEmail(email);
    if (user && await user.checkPassword(password) && user.isActive()) {
        await user.updateLastLogin();
        return user;
    }
    return null;
};

module.exports = User;

