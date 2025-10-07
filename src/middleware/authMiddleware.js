const jwt = require('jsonwebtoken');
const { User, Sede } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ mensaje: 'Token de autenticacion requerido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Sede, as: 'sede' }],
    });
    if (!user || !user.activo) {
      return res.status(401).json({ mensaje: 'Usuario no autorizado o inactivo' });
    }

    req.user = user.toJSON();
    next();
  } catch (error) {
    console.error('Error en autenticacion', error);
    return res.status(401).json({ mensaje: 'Token invalido o expirado' });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ mensaje: 'No autenticado' });
  }

  if (!roles.includes(req.user.rol)) {
    return res.status(403).json({ mensaje: 'No tienes permisos suficientes' });
  }

  return next();
};

module.exports = {
  authMiddleware,
  authorizeRoles,
};
