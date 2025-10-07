const { QueryTypes } = require('sequelize');
const { sequelize, Gasto, Recarga } = require('../models');

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

    const [gastos, recargas] = await Promise.all([
      ejecutarAgregacion({ tipo: 'gasto', agrupacion, filtros }),
      ejecutarAgregacion({ tipo: 'recarga', agrupacion, filtros }),
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
      key: item.clave,
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
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  generarBalance,
};
