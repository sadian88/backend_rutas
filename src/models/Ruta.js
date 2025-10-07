const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ESTADO_RUTA = ['PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'];

const Ruta = sequelize.define(
  'Ruta',
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
    sedeOrigenId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'sede_origen_id',
      references: {
        model: 'sedes',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    sedeDestinoId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'sede_destino_id',
      references: {
        model: 'sedes',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    gruaId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'grua_id',
      references: {
        model: 'gruas',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
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
      onDelete: 'RESTRICT',
    },
    fechaInicio: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'fecha_inicio',
    },
    fechaFin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fecha_fin',
    },
    estado: {
      type: DataTypes.ENUM(...ESTADO_RUTA),
      allowNull: false,
      defaultValue: 'PROGRAMADA',
    },
    kilometros: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'rutas',
  }
);

Ruta.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  values._id = values.id;
  delete values.id;
  return values;
};

module.exports = {
  Ruta,
  ESTADO_RUTA,
};
