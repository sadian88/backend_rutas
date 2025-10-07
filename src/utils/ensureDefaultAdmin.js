const bcrypt = require('bcryptjs');
const { User } = require('../models');

const ensureDefaultAdmin = async () => {
  const {
    DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_ADMIN_NAME = 'Administrador',
  } = process.env;

  if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_PASSWORD) {
    console.warn('Variables DEFAULT_ADMIN_EMAIL/DEFAULT_ADMIN_PASSWORD no configuradas. Se omitira la creacion del administrador por defecto.');
    return;
  }

  const adminExistente = await User.scope('withPassword').findOne({ where: { email: DEFAULT_ADMIN_EMAIL } });
  if (adminExistente) {
    return;
  }

  const passwordHashed = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  await User.create({
    nombre: DEFAULT_ADMIN_NAME,
    email: DEFAULT_ADMIN_EMAIL,
    password: passwordHashed,
    rol: 'ADMIN',
  }, { include: [] });

  console.log('Administrador por defecto creado:', DEFAULT_ADMIN_EMAIL);
};

module.exports = ensureDefaultAdmin;
