const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ESTADO_GRUA = ['EN_SERVICIO', 'MANTENIMIENTO', 'INACTIVA'];

const Grua = sequelize.define(
  'Grua',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    codigo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    placa: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modelo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    capacidadToneladas: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'capacidad_toneladas',
    },
    estado: {
      type: DataTypes.ENUM(...ESTADO_GRUA),
      allowNull: false,
      defaultValue: 'EN_SERVICIO',
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sedeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'sede_id',
      references: {
        model: 'sedes',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
  },
  {
    tableName: 'gruas',
    indexes: [
      {
        unique: true,
        name: 'gruas_codigo_unique',
        fields: ['codigo'],
      },
      {
        unique: true,
        name: 'gruas_placa_unique',
        fields: ['placa'],
      },
    ],
  }
);

Grua.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  values._id = values.id;
  delete values.id;
  return values;
};

module.exports = Grua;
