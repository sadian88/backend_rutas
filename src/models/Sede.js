const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Sede = sequelize.define(
  'Sede',
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
    direccion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    jefeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'jefe_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
  },
  {
    tableName: 'sedes',
    indexes: [
      {
        unique: true,
        name: 'sedes_nombre_unique',
        fields: ['nombre'],
      },
    ],
  }
);

Sede.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  values._id = values.id;
  delete values.id;
  return values;
};

module.exports = Sede;
