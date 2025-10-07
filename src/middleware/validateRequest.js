const { validationResult } = require('express-validator');
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      mensaje: 'Validacin fallida',
      errores: errors.array(),
    });
  }
  return next();
};
module.exports = validateRequest;


