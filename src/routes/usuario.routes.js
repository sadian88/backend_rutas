const { Router } = require('express');
const { body, param } = require('express-validator');
const { createUsuario, listUsuarios, updateUsuario, deleteUsuario } = require('../controllers/usuarioController');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  authorizeRoles('ADMIN'),
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('email').isEmail().withMessage('Debe proporcionar un email valido'),
    body('password').isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
    body('rol')
      .notEmpty()
      .withMessage('Debe indicar un rol')
      .customSanitizer((valor) => String(valor).toUpperCase())
      .isIn(['ADMIN', 'JEFE', 'CONDUCTOR'])
      .withMessage('Rol no valido'),
    body('sede').optional({ nullable: true }).isInt({ min: 1 }).withMessage('La sede debe ser un identificador valido'),
  ],
  validateRequest,
  createUsuario
);

router.get('/', authorizeRoles('ADMIN', 'JEFE'), listUsuarios);

router.put(
  '/:id',
  authorizeRoles('ADMIN'),
  [
    body('rol').optional().isIn(['ADMIN', 'JEFE', 'CONDUCTOR']),
    body('activo').optional().isBoolean(),
    body('sede').optional({ nullable: true }).isInt({ min: 1 }).withMessage('La sede debe ser un identificador valido'),
  ],
  validateRequest,
  updateUsuario
);

router.delete(
  '/:id',
  authorizeRoles('ADMIN'),
  [param('id').isInt({ min: 1 }).withMessage('Identificador invalido')],
  validateRequest,
  deleteUsuario
);

module.exports = router;
