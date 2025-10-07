const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CATEGORIAS_GASTO = ['PEAJE', 'COMBUSTIBLE', 'ALIMENTACION', 'HOSPEDAJE', 'MANTENIMIENTO', 'OTRO'];

const Gasto = sequelize.define(
  'Gasto',
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
    categoria: {
      type: DataTypes.ENUM(...CATEGORIAS_GASTO),
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
    comprobanteUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'comprobante_url',
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
    conductorId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'conductor_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
  },
  {
    tableName: 'gastos',
  }
);

Gasto.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  values._id = values.id;
  delete values.id;
  return values;
};

module.exports = {
  Gasto,
  CATEGORIAS_GASTO,
};
