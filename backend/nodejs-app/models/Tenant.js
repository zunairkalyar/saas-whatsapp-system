const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tenant = sequelize.define('Tenant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'tenants',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

Tenant.findBySlug = function(slug) {
    return this.findOne({ where: { slug } });
};

module.exports = Tenant;
