const { Sequelize } = require('sequelize');

const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`La variable de entorno ${key} es obligatoria`);
  }
});

const parseIntEnv = (value, fallback, label) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`La variable de entorno ${label} debe ser numerica`);
  }

  return parsed;
};

const dbPort = parseIntEnv(process.env.DB_PORT, 3306, 'DB_PORT');

const poolConfig = {
  max: parseIntEnv(process.env.DB_POOL_MAX, 10, 'DB_POOL_MAX'),
  min: parseIntEnv(process.env.DB_POOL_MIN, 0, 'DB_POOL_MIN'),
  acquire: parseIntEnv(process.env.DB_POOL_ACQUIRE, 30000, 'DB_POOL_ACQUIRE'),
  idle: parseIntEnv(process.env.DB_POOL_IDLE, 10000, 'DB_POOL_IDLE'),
};

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: dbPort,
  dialect: process.env.DB_DIALECT || 'mysql',
  logging: false,
  timezone: '+00:00',
  pool: poolConfig,
  dialectOptions: {
    decimalNumbers: true,
  },
  define: {
    underscored: true,
    paranoid: false,
  },
});

const connectDb = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexion a MySQL establecida');
  } catch (error) {
    console.error('Error conectando a MySQL', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectDb,
};
