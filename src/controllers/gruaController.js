const { Grua, Sede } = require('../models');

const normalizeId = (value) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    const error = new Error('Identificador invalido');
    error.statusCode = 400;
    throw error;
  }
  return parsed;
};

const ensureJefeOwnsSede = (user, sedeId) => {
  if (user.rol === 'ADMIN') {
    return;
  }

  if (user.rol === 'JEFE') {
    const userSedeId = user.sede?._id || user.sedeId;
    if (!userSedeId) {
      const error = new Error('Tu usuario no tiene una sede asignada');
      error.statusCode = 400;
      throw error;
    }
    if (Number(userSedeId) !== Number(sedeId)) {
      const error = new Error('Solo puedes gestionar gruas de tu sede');
      error.statusCode = 403;
      throw error;
    }
  }
};

const includeSede = [{ model: Sede, as: 'sede' }];

const createGrua = async (req, res, next) => {
  try {
    const { codigo, placa, modelo, capacidadToneladas, sede, estado, descripcion } = req.body;

    const sedeId = normalizeId(sede);
    ensureJefeOwnsSede(req.user, sedeId);

    const grua = await Grua.create({
      codigo,
      placa,
      modelo,
      capacidadToneladas,
      sedeId,
      estado,
      descripcion,
    });

    const populated = await Grua.findByPk(grua.id, { include: includeSede });
    return res.status(201).json({
      mensaje: 'Grua registrada',
      grua: populated,
    });
  } catch (error) {
    return next(error);
  }
};

const listGruas = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.rol === 'JEFE') {
      const sedeId = req.user.sede?._id || req.user.sedeId;
      if (sedeId) {
        where.sedeId = Number(sedeId);
      }
    }

    const gruas = await Grua.findAll({ where, include: includeSede, order: [['codigo', 'ASC']] });
    return res.json({ gruas });
  } catch (error) {
    return next(error);
  }
};

const getGrua = async (req, res, next) => {
  try {
    const grua = await Grua.findByPk(req.params.id, { include: includeSede });
    if (!grua) {
      return res.status(404).json({ mensaje: 'Grua no encontrada' });
    }

    ensureJefeOwnsSede(req.user, grua.sedeId);
    return res.json({ grua });
  } catch (error) {
    return next(error);
  }
};

const updateGrua = async (req, res, next) => {
  try {
    const grua = await Grua.findByPk(req.params.id);
    if (!grua) {
      return res.status(404).json({ mensaje: 'Grua no encontrada' });
    }

    const sedeDestino = req.body.sede ? normalizeId(req.body.sede) : grua.sedeId;
    ensureJefeOwnsSede(req.user, sedeDestino);

    const payload = { ...req.body };
    if (payload.sede) {
      payload.sedeId = sedeDestino;
      delete payload.sede;
    }

    await grua.update(payload);

    const populated = await Grua.findByPk(grua.id, { include: includeSede });
    return res.json({ mensaje: 'Grua actualizada', grua: populated });
  } catch (error) {
    return next(error);
  }
};

const deleteGrua = async (req, res, next) => {
  try {
    const grua = await Grua.findByPk(req.params.id);
    if (!grua) {
      return res.status(404).json({ mensaje: 'Grua no encontrada' });
    }
    ensureJefeOwnsSede(req.user, grua.sedeId);
    await grua.destroy();
    return res.json({ mensaje: 'Grua eliminada' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createGrua,
  listGruas,
  getGrua,
  updateGrua,
  deleteGrua,
};
