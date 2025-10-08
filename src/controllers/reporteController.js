const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const parseDate = (value, label) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Formato de fecha "${label}" invalido`);
    error.statusCode = 400;
    throw error;
  }
  return date;
};

const buildWhereClauses = ({
  desde,
  hasta,
  rutaId,
  sedeId,
  conductorId,
  alias,
}) => {
  const conditions = ['1=1'];
  const replacements = {};

  if (desde) {
    conditions.push(`${alias}.fecha >= :desde`);
    replacements.desde = desde;
  }

  if (hasta) {
    conditions.push(`${alias}.fecha <= :hasta`);
    replacements.hasta = hasta;
  }

  if (rutaId) {
    conditions.push(`${alias}.ruta_id = :rutaId`);
    replacements.rutaId = Number(rutaId);
  }

  if (sedeId) {
    conditions.push('(rt.sede_origen_id = :sedeId OR rt.sede_destino_id = :sedeId)');
    replacements.sedeId = Number(sedeId);
  }

  if (conductorId) {
    conditions.push('rt.conductor_id = :conductorId');
    replacements.conductorId = Number(conductorId);
  }

  return { conditions: conditions.join(' AND '), replacements };
};

const buildAggregationQuery = ({ tipo, agrupacion, filtros }) => {
  const table = tipo === 'gasto' ? 'gastos' : 'recargas';
  const alias = tipo === 'gasto' ? 'g' : 'rc';
  let selectKey;
  let selectLabel;
  let extraJoins = '';

  switch (agrupacion) {
    case 'ruta':
      selectKey = 'rt.id';
      selectLabel = 'rt.nombre';
      break;
    case 'sede':
      selectKey = 'rt.sede_origen_id';
      selectLabel = 'sd.nombre';
      extraJoins += ' JOIN sedes sd ON sd.id = rt.sede_origen_id';
      break;
    case 'conductor':
      selectKey = 'rt.conductor_id';
      selectLabel = 'u.nombre';
      extraJoins += ' JOIN users u ON u.id = rt.conductor_id';
      break;
    case 'mes':
      selectKey = `DATE_FORMAT(${alias}.fecha, '%Y-%m')`;
      selectLabel = selectKey;
      break;
    default:
      selectKey = `'${tipo}'`;
      selectLabel = tipo === 'gasto' ? `'Gastos'` : `'Recargas'`;
      break;
  }

  const { conditions, replacements } = buildWhereClauses({ ...filtros, alias });

  const sql = `
    SELECT
      ${selectKey} AS clave,
      ${selectLabel} AS etiqueta,
      SUM(${alias}.monto) AS total
    FROM ${table} ${alias}
    JOIN rutas rt ON rt.id = ${alias}.ruta_id
    ${extraJoins}
    WHERE ${conditions}
    GROUP BY 1, 2
    ORDER BY etiqueta
  `;

  return { sql, replacements };
};

const ejecutarAgregacion = async (params) => {
  const { sql, replacements } = buildAggregationQuery(params);
  return sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
  });
};

const mapToGroupTotals = (items) =>
  items.map((item) => ({
    key: item.clave === null ? '0' : String(item.clave),
    etiqueta: item.etiqueta,
    total: Number(item.total || 0),
  }));

const obtenerDetalleRutas = async ({ filtros, rutaId, sedeId, conductorId }) => {
  const where = ['1=1'];
  const replacements = {};

  if (rutaId) {
    where.push('rt.id = :rutaId');
    replacements.rutaId = Number(rutaId);
  }

  if (sedeId) {
    where.push('(rt.sede_origen_id = :sedeId OR rt.sede_destino_id = :sedeId)');
    replacements.sedeId = Number(sedeId);
  }

  if (conductorId) {
    where.push('rt.conductor_id = :conductorId');
    replacements.conductorId = Number(conductorId);
  }

  if (filtros.desde) {
    replacements.fechaDesde = filtros.desde;
  }

  if (filtros.hasta) {
    replacements.fechaHasta = filtros.hasta;
  }

  const filtrosFechaGasto = [];
  const filtrosFechaRecarga = [];

  if (filtros.desde) {
    filtrosFechaGasto.push('g.fecha >= :fechaDesde');
    filtrosFechaRecarga.push('rc.fecha >= :fechaDesde');
  }

  if (filtros.hasta) {
    filtrosFechaGasto.push('g.fecha <= :fechaHasta');
    filtrosFechaRecarga.push('rc.fecha <= :fechaHasta');
  }

  const sql = `
    SELECT
      rt.id AS rutaId,
      rt.nombre AS nombreRuta,
      rt.fecha_inicio AS fechaInicio,
      rt.fecha_fin AS fechaFin,
      u.id AS conductorId,
      u.nombre AS conductorNombre,
      so.id AS sedeOrigenId,
      so.nombre AS sedeOrigenNombre,
      sd.id AS sedeDestinoId,
      sd.nombre AS sedeDestinoNombre,
      COALESCE((
        SELECT SUM(g.monto)
        FROM gastos g
        WHERE g.ruta_id = rt.id
        ${filtrosFechaGasto.length ? `AND ${filtrosFechaGasto.join(' AND ')}` : ''}
      ), 0) AS totalGastos,
      COALESCE((
        SELECT SUM(rc.monto)
        FROM recargas rc
        WHERE rc.ruta_id = rt.id
        ${filtrosFechaRecarga.length ? `AND ${filtrosFechaRecarga.join(' AND ')}` : ''}
      ), 0) AS totalRecargas
    FROM rutas rt
    JOIN users u ON u.id = rt.conductor_id
    JOIN sedes so ON so.id = rt.sede_origen_id
    JOIN sedes sd ON sd.id = rt.sede_destino_id
    WHERE ${where.join(' AND ')}
    ORDER BY rt.fecha_inicio DESC, rt.nombre ASC
  `;

  const resultados = await sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
  });

  return resultados.map((item) => {
    const totalGastos = Number(item.totalGastos || 0);
    const totalRecargas = Number(item.totalRecargas || 0);
    return {
      rutaId: String(item.rutaId),
      nombreRuta: item.nombreRuta,
      fechaInicio: item.fechaInicio,
      fechaFin: item.fechaFin,
      totalGastos,
      totalRecargas,
      balance: totalRecargas - totalGastos,
      conductor: {
        _id: String(item.conductorId),
        nombre: item.conductorNombre,
      },
      sedeOrigen: {
        _id: String(item.sedeOrigenId),
        nombre: item.sedeOrigenNombre,
      },
      sedeDestino: {
        _id: String(item.sedeDestinoId),
        nombre: item.sedeDestinoNombre,
      },
    };
  });
};

const obtenerSumatorias = async (filtros) => {
  const [
    gastosPorSede,
    gastosPorConductor,
    gastosPorRuta,
    recargasPorSede,
    recargasPorRuta,
  ] = await Promise.all([
    ejecutarAgregacion({ tipo: 'gasto', agrupacion: 'sede', filtros }),
    ejecutarAgregacion({ tipo: 'gasto', agrupacion: 'conductor', filtros }),
    ejecutarAgregacion({ tipo: 'gasto', agrupacion: 'ruta', filtros }),
    ejecutarAgregacion({ tipo: 'recarga', agrupacion: 'sede', filtros }),
    ejecutarAgregacion({ tipo: 'recarga', agrupacion: 'ruta', filtros }),
  ]);

  return {
    gastosPorSede: mapToGroupTotals(gastosPorSede),
    gastosPorConductor: mapToGroupTotals(gastosPorConductor),
    gastosPorRuta: mapToGroupTotals(gastosPorRuta),
    recargasPorSede: mapToGroupTotals(recargasPorSede),
    recargasPorRuta: mapToGroupTotals(recargasPorRuta),
  };
};

const generarBalance = async (req, res, next) => {
  try {
    const {
      desde,
      hasta,
      ruta: rutaId,
      sede: sedeId,
      conductor: conductorId,
      agrupacion = 'mes',
    } = req.query;

    const fechaDesde = parseDate(desde, 'desde');
    const fechaHasta = parseDate(hasta, 'hasta');

    const filtros = {
      desde: fechaDesde ? fechaDesde.toISOString() : null,
      hasta: fechaHasta ? fechaHasta.toISOString() : null,
      rutaId: rutaId ? Number(rutaId) : null,
      sedeId: sedeId ? Number(sedeId) : null,
      conductorId: conductorId ? Number(conductorId) : null,
    };

    const [gastos, recargas, detalleRutas, sumatorias] = await Promise.all([
      ejecutarAgregacion({ tipo: 'gasto', agrupacion, filtros }),
      ejecutarAgregacion({ tipo: 'recarga', agrupacion, filtros }),
      obtenerDetalleRutas({ filtros, rutaId: filtros.rutaId, sedeId: filtros.sedeId, conductorId: filtros.conductorId }),
      obtenerSumatorias(filtros),
    ]);

    const balanceMap = new Map();

    gastos.forEach((item) => {
      const clave = item.clave ?? 'gastos';
      balanceMap.set(clave, {
        clave,
        etiqueta: item.etiqueta,
        totalGastos: Number(item.total || 0),
        totalRecargas: 0,
      });
    });

    recargas.forEach((item) => {
      const clave = item.clave ?? 'recargas';
      const existente = balanceMap.get(clave) || {
        clave,
        etiqueta: item.etiqueta,
        totalGastos: 0,
        totalRecargas: 0,
      };
      existente.totalRecargas = Number(item.total || 0);
      existente.etiqueta = existente.etiqueta || item.etiqueta;
      balanceMap.set(clave, existente);
    });

    const resultados = Array.from(balanceMap.values()).map((item) => ({
      ...item,
      key: String(item.clave),
      balance: item.totalRecargas - item.totalGastos,
    }));

    const totalesGenerales = resultados.reduce(
      (acc, item) => {
        acc.totalGastos += item.totalGastos;
        acc.totalRecargas += item.totalRecargas;
        return acc;
      },
      { totalGastos: 0, totalRecargas: 0 }
    );
    totalesGenerales.balance = totalesGenerales.totalRecargas - totalesGenerales.totalGastos;

    return res.json({
      filtrosAplicados: {
        desde: fechaDesde ? fechaDesde.toISOString() : null,
        hasta: fechaHasta ? fechaHasta.toISOString() : null,
        ruta: rutaId || null,
        sede: sedeId || null,
        conductor: conductorId || null,
        agrupacion,
      },
      resultados,
      totalesGenerales,
      detalleRutas,
      sumatorias,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  generarBalance,
};
