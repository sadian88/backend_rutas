const { Router } = require('express');
const { body } = require('express-validator');
const {
  createSede,
  listSedes,
  getSede,
  updateSede,
  deleteSede,
} = require('../controllers/sedeController');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const router = Router();
router.use(authMiddleware);
router.post(
  '/',
  authorizeRoles('ADMIN'),
  [body('nombre').notEmpty().withMessage('El nombre es obligatorio')],
  validateRequest,
  createSede
);
router.get('/', listSedes);
router.get('/:id', getSede);
router.put(
  '/:id',
  authorizeRoles('ADMIN'),
  [body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vaco')],
  validateRequest,
  updateSede
);
router.delete('/:id', authorizeRoles('ADMIN'), deleteSede);
module.exports = router;


