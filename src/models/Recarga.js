const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Recarga = sequelize.define(
  'Recarga',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    monto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    rutaId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'ruta_id',
      references: {
        model: 'rutas',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    jefeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'jefe_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
  },
  {
    tableName: 'recargas',
  }
);

Recarga.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  values._id = values.id;
  delete values.id;
  return values;
};

module.exports = Recarga;
