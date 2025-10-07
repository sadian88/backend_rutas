/* eslint-disable no-unused-vars */
const errorHandler = (err, req, res, next) => {
  console.error('Error no controlado', err);
  const status = err.statusCode || 500;
  const mensaje = err.message || 'Error interno del servidor';
  return res.status(status).json({
    mensaje,
    detalles: err.detalles || undefined,
  });
};
module.exports = errorHandler;


