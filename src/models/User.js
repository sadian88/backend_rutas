const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const USER_ROLES = ['ADMIN', 'JEFE', 'CONDUCTOR'];

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rol: {
      type: DataTypes.ENUM(...USER_ROLES),
      allowNull: false,
      defaultValue: 'CONDUCTOR',
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sedeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'sede_id',
      references: {
        model: 'sedes',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
  },
  {
    tableName: 'users',
    indexes: [
      {
        unique: true,
        name: 'users_email_unique',
        fields: ['email'],
      },
    ],
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password'] },
      },
    },
  }
);

User.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  values._id = values.id;
  delete values.id;
  delete values.password;
  return values;
};

module.exports = {
  User,
  USER_ROLES,
};

