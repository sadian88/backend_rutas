const { Router } = require('express');
const { body } = require('express-validator');
const { registerUser, login, getProfile } = require('../controllers/authController');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const router = Router();
router.post(
  '/register',
  authMiddleware,
  authorizeRoles('ADMIN'),
  [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('email').isEmail().withMessage('Debe proporcionar un email valido'),
    body('password').isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
    body('rol').notEmpty().withMessage('Debe indicar un rol'),
  ],
  validateRequest,
  registerUser
);
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Debe proporcionar un email valido'),
    body('password').notEmpty().withMessage('La contrasena es obligatoria'),
  ],
  validateRequest,
  login
);
router.get('/perfil', authMiddleware, getProfile);
module.exports = router;



