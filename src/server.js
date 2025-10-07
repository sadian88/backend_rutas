require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { connectDb } = require('./config/db');
const models = require('./models');
const errorHandler = require('./middleware/errorHandler');
const ensureDefaultAdmin = require('./utils/ensureDefaultAdmin');
const ensureSchemaConsistency = require('./utils/ensureSchemaConsistency');

const authRoutes = require('./routes/auth.routes');
const sedeRoutes = require('./routes/sede.routes');
const gruaRoutes = require('./routes/grua.routes');
const rutaRoutes = require('./routes/ruta.routes');
const reporteRoutes = require('./routes/reporte.routes');
const usuarioRoutes = require('./routes/usuario.routes');

const app = express();

const parseOrigins = (value = '') =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOrigins = parseOrigins(process.env.CORS_ALLOWED_ORIGINS);

if (!corsOrigins.length) {
  corsOrigins.push('http://localhost:3000');
}

if (process.env.NODE_ENV === 'production') {
  corsOrigins.push('https://sadian88.github.io');
}

const allowedOrigins = new Set(corsOrigins);
const allowAll = allowedOrigins.has('*');

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowAll || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/sedes', sedeRoutes);
app.use('/api/gruas', gruaRoutes);
app.use('/api/rutas', rutaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/usuarios', usuarioRoutes);

app.use((req, res) => {
  res.status(404).json({ mensaje: 'Recurso no encontrado' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

const start = async () => {
  try {
    await connectDb();
    await ensureSchemaConsistency(models.sequelize);
    await models.sequelize.sync();
    await ensureDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('No fue posible iniciar el servidor', error);
    process.exit(1);
  }
};

start();
