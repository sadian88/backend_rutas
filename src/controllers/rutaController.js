const { Op, fn, col } = require('sequelize');
const {
  Ruta,
  User,
  Grua,
  Sede,
  Gasto,
  Recarga,
  CATEGORIAS_GASTO,
} = require('../models');

const parseId = (value, label = 'identificador') => {
  const parsed = Number(value);
  if (!value || Number.isNaN(parsed)) {
    const error = new Error(`El ${label} es invalido`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
};

const rutaIncludes = [
  { model: Sede, as: 'sedeOrigen' },
  { model: Sede, as: 'sedeDestino' },
  { model: Grua, as: 'grua' },
  { model: User, as: 'conductor' },
];

const verificarRolConductor = async (conductorId) => {
  const conductor = await User.findByPk(conductorId);
  if (!conductor) {
    const error = new Error('El conductor indicado no existe');
    error.statusCode = 404;
    throw error;
  }
  if (conductor.rol !== 'CONDUCTOR') {
    const error = new Error('El usuario asignado no tiene rol de CONDUCTOR');
    error.statusCode = 400;
    throw error;
  }
  if (!conductor.activo) {
    const error = new Error('El conductor esta inactivo');
    error.statusCode = 400;
    throw error;
  }
  return conductor;
};

const verificarGruaDisponible = async (gruaId) => {
  const grua = await Grua.findByPk(gruaId);
  if (!grua) {
    const error = new Error('La grua indicada no existe');
    error.statusCode = 404;
    throw error;
  }
  return grua;
};

const validarPermisosCreacionRuta = (user, sedeOrigenId, sedeDestinoId) => {
  if (user.rol === 'ADMIN') {
    return;
  }
  if (user.rol === 'JEFE') {
    const sedeAsignada = user.sede?._id || user.sedeId;
    if (!sedeAsignada) {
      const error = new Error('No tienes una sede asignada');
      error.statusCode = 400;
      throw error;
    }
    const sedeNumero = Number(sedeAsignada);
    if (sedeNumero !== Number(sedeOrigenId) && sedeNumero !== Number(sedeDestinoId)) {
      const error = new Error('Solo puedes crear rutas que involucren tu sede');
      error.statusCode = 403;
      throw error;
    }
    return;
  }
  const error = new Error('No tienes permisos para crear rutas');
  error.statusCode = 403;
  throw error;
};

const usuarioPuedeVerRuta = (user, ruta) => {
  if (user.rol === 'ADMIN') {
    return true;
  }
  if (user.rol === 'JEFE') {
    const sedeAsignada = Number(user.sede?._id || user.sedeId);
    return (
      sedeAsignada &&
      (sedeAsignada === Number(ruta.sedeOrigenId) || sedeAsignada === Number(ruta.sedeDestinoId))
    );
  }
  if (user.rol === 'CONDUCTOR') {
    return Number(user._id || user.id) === Number(ruta.conductorId);
  }
  return false;
};

const calcularTotalesPorRuta = async (rutaIds) => {
  if (!rutaIds.length) {
    return {};
  }

  const [gastos, recargas] = await Promise.all([
    Gasto.findAll({
      attributes: [
        'rutaId',
        [fn('SUM', col('monto')), 'totalGastos'],
        [fn('COUNT', col('id')), 'cantidadGastos'],
      ],
      where: { rutaId: { [Op.in]: rutaIds } },
      group: ['rutaId'],
      raw: true,
    }),
    Recarga.findAll({
      attributes: [
        'rutaId',
        [fn('SUM', col('monto')), 'totalRecargas'],
        [fn('COUNT', col('id')), 'cantidadRecargas'],
      ],
      where: { rutaId: { [Op.in]: rutaIds } },
      group: ['rutaId'],
      raw: true,
    }),
  ]);

  const totales = {};
  gastos.forEach((item) => {
    totales[item.rutaId] = {
      totalGastos: Number(item.totalGastos || 0),
      cantidadGastos: Number(item.cantidadGastos || 0),
      totalRecargas: 0,
      cantidadRecargas: 0,
    };
  });
  recargas.forEach((item) => {
    const existente = totales[item.rutaId] || {
      totalGastos: 0,
      cantidadGastos: 0,
      totalRecargas: 0,
      cantidadRecargas: 0,
    };
    existente.totalRecargas = Number(item.totalRecargas || 0);
    existente.cantidadRecargas = Number(item.cantidadRecargas || 0);
    totales[item.rutaId] = existente;
  });

  return totales;
};

const loadRuta = (id) => Ruta.findByPk(id, { include: rutaIncludes });

const createRuta = async (req, res, next) => {
  try {
    const {
      nombre,
      sedeOrigen,
      sedeDestino,
      grua,
      conductor,
      fechaInicio,
      fechaFin,
      estado,
      kilometros,
      observaciones,
    } = req.body;

    const sedeOrigenId = parseId(sedeOrigen, 'sede de origen');
    const sedeDestinoId = parseId(sedeDestino, 'sede de destino');
    const gruaId = parseId(grua, 'grua');
    const conductorId = parseId(conductor, 'conductor');

    validarPermisosCreacionRuta(req.user, sedeOrigenId, sedeDestinoId);
    const conductorDoc = await verificarRolConductor(conductorId);
    const gruaDoc = await verificarGruaDisponible(gruaId);

    if (Number(gruaDoc.sedeId) !== Number(sedeOrigenId)) {
      const error = new Error('La grua debe pertenecer a la sede de origen');
      error.statusCode = 400;
      throw error;
    }

    const ruta = await Ruta.create({
      nombre,
      sedeOrigenId,
      sedeDestinoId,
      gruaId,
      conductorId: conductorDoc.id,
      fechaInicio,
      fechaFin: fechaFin || null,
      estado,
      kilometros,
      observaciones,
    });

    const populatedRuta = await loadRuta(ruta.id);
    return res.status(201).json({ mensaje: 'Ruta registrada', ruta: populatedRuta });
  } catch (error) {
    return next(error);
  }
};

const listRutas = async (req, res, next) => {
  try {
    const filtros = {};

    if (req.query.estado) {
      filtros.estado = req.query.estado;
    }
    if (req.query.conductor) {
      filtros.conductorId = parseId(req.query.conductor, 'conductor');
    }
    if (req.query.sede) {
      const sedeId = parseId(req.query.sede, 'sede');
      filtros[Op.or] = [{ sedeOrigenId: sedeId }, { sedeDestinoId: sedeId }];
    }

    if (req.user.rol === 'JEFE') {
      const sedeValue = req.user.sede?._id || req.user.sedeId;
      if (!sedeValue) {
        return res.status(400).json({ mensaje: 'No tienes sede asignada' });
      }
      const sedeAsignada = parseId(sedeValue, 'sede');
      const condicion = { [Op.or]: [{ sedeOrigenId: sedeAsignada }, { sedeDestinoId: sedeAsignada }] };
      filtros[Op.and] = filtros[Op.and] ? [...filtros[Op.and], condicion] : [condicion];
    }

    if (req.user.rol === 'CONDUCTOR') {
      filtros.conductorId = Number(req.user._id || req.user.id);
    }

    const where = Object.keys(filtros).length ? filtros : undefined;
    const rutas = await Ruta.findAll({
      where,
      include: rutaIncludes,
      order: [['fechaInicio', 'DESC']],
    });

    const totales = await calcularTotalesPorRuta(rutas.map((ruta) => ruta.id));
    const rutasConTotales = rutas.map((ruta) => {
      const data = ruta.toJSON();
      const info = totales[ruta.id] || {
        totalGastos: 0,
        cantidadGastos: 0,
        totalRecargas: 0,
        cantidadRecargas: 0,
      };
      data.resumen = {
        totalGastos: info.totalGastos,
        totalRecargas: info.totalRecargas,
        balance: info.totalRecargas - info.totalGastos,
        cantidadGastos: info.cantidadGastos,
        cantidadRecargas: info.cantidadRecargas,
      };
      return data;
    });

    return res.json({ rutas: rutasConTotales });
  } catch (error) {
    return next(error);
  }
};

const getRuta = async (req, res, next) => {
  try {
    const ruta = await loadRuta(req.params.id);
    if (!ruta) {
      return res.status(404).json({ mensaje: 'Ruta no encontrada' });
    }
    if (!usuarioPuedeVerRuta(req.user, ruta)) {
      return res.status(403).json({ mensaje: 'No tienes acceso a esta ruta' });
    }

    const [gastos, recargas] = await Promise.all([
      Gasto.findAll({
        where: { rutaId: ruta.id },
        order: [['fecha', 'DESC']],
        include: [{ model: User, as: 'conductor', attributes: ['id', 'nombre', 'email', 'rol'], required: false }],
      }),
      Recarga.findAll({
        where: { rutaId: ruta.id },
        order: [['fecha', 'DESC']],
        include: [{ model: User, as: 'jefe', attributes: ['id', 'nombre', 'email', 'rol'], required: false }],
      }),
    ]);

    return res.json({
      ruta,
      gastos,
      recargas,
    });
  } catch (error) {
    return next(error);
  }
};

const updateRuta = async (req, res, next) => {
  try {
    const ruta = await Ruta.findByPk(req.params.id);
    if (!ruta) {
      return res.status(404).json({ mensaje: 'Ruta no encontrada' });
    }

    if (!usuarioPuedeVerRuta(req.user, ruta)) {
      return res.status(403).json({ mensaje: 'No tienes acceso a esta ruta' });
    }

    const payload = { ...req.body };

    if (payload.conductor) {
      const conductorId = parseId(payload.conductor, 'conductor');
      if (conductorId !== Number(ruta.conductorId)) {
        await verificarRolConductor(conductorId);
      }
      payload.conductorId = conductorId;
      delete payload.conductor;
    }

    if (payload.grua) {
      const gruaId = parseId(payload.grua, 'grua');
      if (gruaId !== Number(ruta.gruaId)) {
        await verificarGruaDisponible(gruaId);
      }
      payload.gruaId = gruaId;
      delete payload.grua;
    }

    if (payload.sedeOrigen) {
      payload.sedeOrigenId = parseId(payload.sedeOrigen, 'sede de origen');
      delete payload.sedeOrigen;
    }

    if (payload.sedeDestino) {
      payload.sedeDestinoId = parseId(payload.sedeDestino, 'sede de destino');
      delete payload.sedeDestino;
    }

    await ruta.update(payload);

    const populated = await loadRuta(ruta.id);
    return res.json({ mensaje: 'Ruta actualizada', ruta: populated });
  } catch (error) {
    return next(error);
  }
};

const registrarGasto = async (req, res, next) => {
  try {
    const rutaId = parseId(req.params.id, 'ruta');
    const ruta = await Ruta.findByPk(rutaId);
    if (!ruta) {
      return res.status(404).json({ mensaje: 'Ruta no encontrada' });
    }

    const userId = Number(req.user._id || req.user.id);
    let conductorId = userId;

    if (req.user.rol === 'CONDUCTOR') {
      if (Number(ruta.conductorId) !== conductorId) {
        return res.status(403).json({ mensaje: 'Solo el conductor asignado puede reportar gastos' });
      }
    } else if (req.user.rol === 'ADMIN') {
      if (!ruta.conductorId) {
        return res.status(400).json({ mensaje: 'La ruta no tiene un conductor asignado' });
      }
      conductorId = Number(ruta.conductorId);
    } else {
      return res.status(403).json({ mensaje: 'No tienes permisos para registrar gastos' });
    }

    const categoria = String(req.body.categoria || '').toUpperCase();
    if (!CATEGORIAS_GASTO.includes(categoria)) {
      return res.status(400).json({ mensaje: 'Categoria de gasto invalida' });
    }

    const monto = Number(req.body.monto);
    if (Number.isNaN(monto) || monto <= 0) {
      return res.status(400).json({ mensaje: 'El monto debe ser mayor a 0' });
    }

    const descripcion = (req.body.descripcion || '').trim();
    if (!descripcion) {
      return res.status(400).json({ mensaje: 'La descripcion es obligatoria' });
    }

    const fecha = req.body.fecha ? new Date(req.body.fecha) : new Date();
    if (Number.isNaN(fecha.getTime())) {
      return res.status(400).json({ mensaje: 'La fecha indicada no es valida' });
    }

    const gastoCreado = await Gasto.create({
      rutaId: ruta.id,
      conductorId,
      descripcion,
      categoria,
      monto,
      fecha,
      comprobanteUrl: req.body.comprobanteUrl || null,
    });

    const gasto = await Gasto.findByPk(gastoCreado.id, {
      include: [{ model: User, as: 'conductor', attributes: ['id', 'nombre', 'email', 'rol'] }],
    });

    return res.status(201).json({ mensaje: 'Gasto registrado', gasto });
  } catch (error) {
    return next(error);
  }
};

const listarGastosRuta = async (req, res, next) => {
  try {
    const ruta = await Ruta.findByPk(req.params.id);
    if (!ruta) {
      return res.status(404).json({ mensaje: 'Ruta no encontrada' });
    }
    if (!usuarioPuedeVerRuta(req.user, ruta)) {
      return res.status(403).json({ mensaje: 'No tienes acceso a esta ruta' });
    }

    const gastos = await Gasto.findAll({
      where: { rutaId: ruta.id },
      order: [['fecha', 'DESC']],
      include: [{ model: User, as: 'conductor', attributes: ['id', 'nombre', 'email'] }],
    });

    return res.json({ gastos });
  } catch (error) {
    return next(error);
  }
};

const registrarRecarga = async (req, res, next) => {
  try {
    const rutaId = parseId(req.params.id, 'ruta');
    const ruta = await Ruta.findByPk(rutaId);
    if (!ruta) {
      return res.status(404).json({ mensaje: 'Ruta no encontrada' });
    }

    const userId = Number(req.user._id || req.user.id);

    if (req.user.rol === 'JEFE') {
      const sedeAsignada = req.user.sede?._id || req.user.sedeId;
      if (!sedeAsignada) {
        return res.status(400).json({ mensaje: 'Tu usuario no tiene sede asignada' });
      }

      if (
        Number(ruta.sedeOrigenId) !== Number(sedeAsignada) &&
        Number(ruta.sedeDestinoId) !== Number(sedeAsignada)
      ) {
        return res.status(403).json({ mensaje: 'Solo puedes registrar recargas en rutas de tu sede' });
      }
    } else if (req.user.rol !== 'ADMIN') {
      return res.status(403).json({ mensaje: 'No tienes permisos para registrar recargas' });
    }

    const descripcion = (req.body.descripcion || '').trim();
    if (!descripcion) {
      return res.status(400).json({ mensaje: 'La descripcion es obligatoria' });
    }

    const monto = Number(req.body.monto);
    if (Number.isNaN(monto) || monto <= 0) {
      return res.status(400).json({ mensaje: 'El monto debe ser mayor a 0' });
    }

    const fecha = req.body.fecha ? new Date(req.body.fecha) : new Date();
    if (Number.isNaN(fecha.getTime())) {
      return res.status(400).json({ mensaje: 'La fecha indicada no es valida' });
    }

    const recargaCreada = await Recarga.create({
      rutaId: ruta.id,
      jefeId: userId,
      descripcion,
      monto,
      fecha,
    });

    const recarga = await Recarga.findByPk(recargaCreada.id, {
      include: [{ model: User, as: 'jefe', attributes: ['id', 'nombre', 'email', 'rol'] }],
    });

    return res.status(201).json({ mensaje: 'Recarga registrada', recarga });
  } catch (error) {
    return next(error);
  }
};

const actualizarGasto = async (req, res, next) => {
  try {
    const rutaId = parseId(req.params.id, 'ruta');
    const gastoId = parseId(req.params.gastoId, 'gasto');

    const gasto = await Gasto.findByPk(gastoId);
    if (!gasto || Number(gasto.rutaId) !== rutaId) {
      return res.status(404).json({ mensaje: 'Gasto no encontrado' });
    }

    const userId = Number(req.user._id || req.user.id);
    if (req.user.rol === 'ADMIN') {
      // always allowed
    } else if (req.user.rol === 'CONDUCTOR') {
      if (Number(gasto.conductorId) !== userId) {
        return res.status(403).json({ mensaje: 'No puedes modificar este gasto' });
      }
    } else {
      return res.status(403).json({ mensaje: 'No tienes permisos para modificar gastos' });
    }

    const cambios = {};

    if (req.body.descripcion !== undefined) {
      const descripcion = String(req.body.descripcion).trim();
      if (!descripcion) {
        return res.status(400).json({ mensaje: 'La descripcion es obligatoria' });
      }
      cambios.descripcion = descripcion;
    }

    if (req.body.categoria !== undefined) {
      const categoria = String(req.body.categoria).toUpperCase();
      if (!CATEGORIAS_GASTO.includes(categoria)) {
        return res.status(400).json({ mensaje: 'Categoria de gasto invalida' });
      }
      cambios.categoria = categoria;
    }

    if (req.body.monto !== undefined) {
      const monto = Number(req.body.monto);
      if (Number.isNaN(monto) || monto <= 0) {
        return res.status(400).json({ mensaje: 'El monto debe ser mayor a 0' });
      }
      cambios.monto = monto;
    }

    if (req.body.fecha !== undefined) {
      const fecha = new Date(req.body.fecha);
      if (Number.isNaN(fecha.getTime())) {
        return res.status(400).json({ mensaje: 'La fecha indicada no es valida' });
      }
      cambios.fecha = fecha;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'comprobanteUrl')) {
      const comprobante = req.body.comprobanteUrl;
      cambios.comprobanteUrl = comprobante ? String(comprobante).trim() : null;
    }

    if (!Object.keys(cambios).length) {
      return res.status(400).json({ mensaje: 'No se recibieron cambios para actualizar' });
    }

    await gasto.update(cambios);

    const actualizado = await Gasto.findByPk(gasto.id, {
      include: [{ model: User, as: 'conductor', attributes: ['id', 'nombre', 'email', 'rol'] }],
    });

    return res.json({ mensaje: 'Gasto actualizado', gasto: actualizado });
  } catch (error) {
    return next(error);
  }
};

const eliminarGasto = async (req, res, next) => {
  try {
    const rutaId = parseId(req.params.id, 'ruta');
    const gastoId = parseId(req.params.gastoId, 'gasto');

    const gasto = await Gasto.findByPk(gastoId);
    if (!gasto || Number(gasto.rutaId) !== rutaId) {
      return res.status(404).json({ mensaje: 'Gasto no encontrado' });
    }

    const userId = Number(req.user._id || req.user.id);

    if (req.user.rol === 'ADMIN') {
      // allowed
    } else if (req.user.rol === 'CONDUCTOR') {
      if (Number(gasto.conductorId) !== userId) {
        return res.status(403).json({ mensaje: 'No puedes eliminar este gasto' });
      }
    } else {
      return res.status(403).json({ mensaje: 'No tienes permisos para eliminar gastos' });
    }

    await gasto.destroy();

    return res.json({ mensaje: 'Gasto eliminado' });
  } catch (error) {
    return next(error);
  }
};

const actualizarRecarga = async (req, res, next) => {
  try {
    const rutaId = parseId(req.params.id, 'ruta');
    const recargaId = parseId(req.params.recargaId, 'recarga');

    const recarga = await Recarga.findByPk(recargaId);
    if (!recarga || Number(recarga.rutaId) !== rutaId) {
      return res.status(404).json({ mensaje: 'Recarga no encontrada' });
    }

    const userId = Number(req.user._id || req.user.id);

    if (req.user.rol === 'ADMIN') {
      // allowed
    } else if (req.user.rol === 'JEFE') {
      if (Number(recarga.jefeId) !== userId) {
        return res.status(403).json({ mensaje: 'Solo puedes editar recargas que registraste' });
      }
      const sedeAsignada = req.user.sede?._id || req.user.sedeId;
      if (!sedeAsignada) {
        return res.status(400).json({ mensaje: 'Tu usuario no tiene sede asignada' });
      }
      const ruta = await Ruta.findByPk(recarga.rutaId);
      if (
        !ruta ||
        (Number(ruta.sedeOrigenId) !== Number(sedeAsignada) &&
          Number(ruta.sedeDestinoId) !== Number(sedeAsignada))
      ) {
        return res.status(403).json({ mensaje: 'No tienes acceso a esta recarga' });
      }
    } else {
      return res.status(403).json({ mensaje: 'No tienes permisos para modificar recargas' });
    }

    const cambios = {};

    if (req.body.descripcion !== undefined) {
      const descripcion = String(req.body.descripcion).trim();
      if (!descripcion) {
        return res.status(400).json({ mensaje: 'La descripcion es obligatoria' });
      }
      cambios.descripcion = descripcion;
    }

    if (req.body.monto !== undefined) {
      const monto = Number(req.body.monto);
      if (Number.isNaN(monto) || monto <= 0) {
        return res.status(400).json({ mensaje: 'El monto debe ser mayor a 0' });
      }
      cambios.monto = monto;
    }

    if (req.body.fecha !== undefined) {
      const fecha = new Date(req.body.fecha);
      if (Number.isNaN(fecha.getTime())) {
        return res.status(400).json({ mensaje: 'La fecha indicada no es valida' });
      }
      cambios.fecha = fecha;
    }

    if (!Object.keys(cambios).length) {
      return res.status(400).json({ mensaje: 'No se recibieron cambios para actualizar' });
    }

    await recarga.update(cambios);

    const actualizada = await Recarga.findByPk(recarga.id, {
      include: [{ model: User, as: 'jefe', attributes: ['id', 'nombre', 'email', 'rol'] }],
    });

    return res.json({ mensaje: 'Recarga actualizada', recarga: actualizada });
  } catch (error) {
    return next(error);
  }
};

const eliminarRecarga = async (req, res, next) => {
  try {
    const rutaId = parseId(req.params.id, 'ruta');
    const recargaId = parseId(req.params.recargaId, 'recarga');

    const recarga = await Recarga.findByPk(recargaId);
    if (!recarga || Number(recarga.rutaId) !== rutaId) {
      return res.status(404).json({ mensaje: 'Recarga no encontrada' });
    }

    const userId = Number(req.user._id || req.user.id);

    if (req.user.rol === 'ADMIN') {
      // allowed
    } else if (req.user.rol === 'JEFE') {
      if (Number(recarga.jefeId) !== userId) {
        return res.status(403).json({ mensaje: 'Solo puedes eliminar recargas que registraste' });
      }
      const sedeAsignada = req.user.sede?._id || req.user.sedeId;
      if (!sedeAsignada) {
        return res.status(400).json({ mensaje: 'Tu usuario no tiene sede asignada' });
      }
      const ruta = await Ruta.findByPk(recarga.rutaId);
      if (
        !ruta ||
        (Number(ruta.sedeOrigenId) !== Number(sedeAsignada) &&
          Number(ruta.sedeDestinoId) !== Number(sedeAsignada))
      ) {
        return res.status(403).json({ mensaje: 'No tienes acceso a esta recarga' });
      }
    } else {
      return res.status(403).json({ mensaje: 'No tienes permisos para eliminar recargas' });
    }

    await recarga.destroy();

    return res.json({ mensaje: 'Recarga eliminada' });
  } catch (error) {
    return next(error);
  }
};

const listarRecargasRuta = async (req, res, next) => {
  try {
    const ruta = await Ruta.findByPk(req.params.id);
    if (!ruta) {
      return res.status(404).json({ mensaje: 'Ruta no encontrada' });
    }
    if (!usuarioPuedeVerRuta(req.user, ruta)) {
      return res.status(403).json({ mensaje: 'No tienes acceso a esta ruta' });
    }

    const recargas = await Recarga.findAll({
      where: { rutaId: ruta.id },
      order: [['fecha', 'DESC']],
      include: [{ model: User, as: 'jefe', attributes: ['id', 'nombre', 'email'] }],
    });

    return res.json({ recargas });
  } catch (error) {
    return next(error);
  }
};

const obtenerResumenConductor = async (req, res, next) => {
  try {
    if (req.user.rol !== 'CONDUCTOR') {
      return res.status(403).json({ mensaje: 'Solo disponible para conductores' });
    }

    const conductorId = Number(req.user._id || req.user.id);

    const rutas = await Ruta.findAll({
      where: { conductorId },
      include: rutaIncludes,
      order: [['fechaInicio', 'DESC']],
    });

    const gastos = await Gasto.findAll({
      where: { conductorId },
      order: [['fecha', 'DESC']],
      include: [{ model: Ruta, as: 'ruta', attributes: ['id', 'nombre', 'fechaInicio', 'fechaFin'] }],
    });

    const totalesPorRuta = await calcularTotalesPorRuta(rutas.map((ruta) => ruta.id));

    return res.json({ rutas, gastos, totalesPorRuta });
  } catch (error) {
    return next(error);
  }
};

const obtenerResumenJefe = async (req, res, next) => {
  try {
    if (req.user.rol !== 'JEFE') {
      return res.status(403).json({ mensaje: 'Solo disponible para jefes de sede' });
    }
    const sedeAsignada = req.user.sede?._id || req.user.sedeId;
    if (!sedeAsignada) {
      return res.status(400).json({ mensaje: 'No tienes sede asignada' });
    }

    const rutas = await Ruta.findAll({
      where: {
        [Op.or]: [{ sedeOrigenId: sedeAsignada }, { sedeDestinoId: sedeAsignada }],
      },
      include: rutaIncludes,
      order: [['fechaInicio', 'DESC']],
    });

    const totales = await calcularTotalesPorRuta(rutas.map((ruta) => ruta.id));

    return res.json({ rutas, totalesPorRuta: totales });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createRuta,
  listRutas,
  getRuta,
  updateRuta,
  registrarGasto,
  listarGastosRuta,
  actualizarGasto,
  eliminarGasto,
  registrarRecarga,
  listarRecargasRuta,
  actualizarRecarga,
  eliminarRecarga,
  obtenerResumenConductor,
  obtenerResumenJefe,
};
