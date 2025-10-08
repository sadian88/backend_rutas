const { Op } = require('sequelize');
const { sequelize, Sede, User, Ruta } = require('../models');

const asignarJefeASede = async (sede, jefeId) => {
  if (!jefeId) {
    await sede.update({ jefeId: null });
    return null;
  }

  const id = Number(jefeId);
  if (Number.isNaN(id)) {
    const error = new Error('Identificador de jefe invalido');
    error.statusCode = 400;
    throw error;
  }

  const jefe = await User.findByPk(id);
  if (!jefe) {
    const error = new Error('El jefe indicado no existe');
    error.statusCode = 404;
    throw error;
  }

  if (jefe.rol !== 'JEFE') {
    const error = new Error('El usuario seleccionado no tiene rol de JEFE');
    error.statusCode = 400;
    throw error;
  }

  await jefe.update({ sedeId: sede.id });
  await sede.update({ jefeId: jefe.id });
  return jefe;
};

const buildInclude = () => [{ model: User, as: 'jefe' }];

const createSede = async (req, res, next) => {
  try {
    const { nombre, direccion, telefono, descripcion, jefe } = req.body;
    const sede = await Sede.create({ nombre, direccion, telefono, descripcion });

    if (jefe) {
      await asignarJefeASede(sede, jefe);
    }

    const populated = await Sede.findByPk(sede.id, { include: buildInclude() });
    return res.status(201).json({
      mensaje: 'Sede creada correctamente',
      sede: populated,
    });
  } catch (error) {
    return next(error);
  }
};

const listSedes = async (req, res, next) => {
  try {
    const sedes = await Sede.findAll({ include: buildInclude(), order: [['nombre', 'ASC']] });
    return res.json({ sedes });
  } catch (error) {
    return next(error);
  }
};

const getSede = async (req, res, next) => {
  try {
    const sede = await Sede.findByPk(req.params.id, { include: buildInclude() });
    if (!sede) {
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }
    return res.json({ sede });
  } catch (error) {
    return next(error);
  }
};

const updateSede = async (req, res, next) => {
  try {
    const { jefe, ...payload } = req.body;
    const sede = await Sede.findByPk(req.params.id);
    if (!sede) {
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }

    await sede.update(payload);

    if (jefe !== undefined) {
      await asignarJefeASede(sede, jefe);
    }

    const populated = await Sede.findByPk(sede.id, { include: buildInclude() });
    return res.json({
      mensaje: 'Sede actualizada',
      sede: populated,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteSede = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const sede = await Sede.findByPk(req.params.id, { transaction });
    if (!sede) {
      await transaction.rollback();
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }

    const rutasEliminadas = await Ruta.destroy({
      where: {
        [Op.or]: [{ sedeOrigenId: sede.id }, { sedeDestinoId: sede.id }],
      },
      transaction,
    });

    if (sede.jefeId) {
      await User.update({ sedeId: null }, { where: { id: sede.jefeId }, transaction });
    }

    await sede.destroy({ transaction });
    await transaction.commit();

    return res.json({
      mensaje: rutasEliminadas
        ? 'Sede eliminada junto con rutas y recargas asociadas'
        : 'Sede eliminada',
    });
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};

module.exports = {
  createSede,
  listSedes,
  getSede,
  updateSede,
  deleteSede,
};

