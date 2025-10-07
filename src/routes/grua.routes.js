const { Router } = require('express');
const { body } = require('express-validator');
const {
  createGrua,
  listGruas,
  getGrua,
  updateGrua,
  deleteGrua,
} = require('../controllers/gruaController');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const router = Router();
router.use(authMiddleware);
router.post(
  '/',
  authorizeRoles('ADMIN', 'JEFE'),
  [
    body('codigo').notEmpty().withMessage('El cdigo interno es obligatorio'),
    body('placa').notEmpty().withMessage('La placa es obligatoria'),
    body('sede').isInt({ gt: 0 }).withMessage('Debes indicar la sede'),
  ],
  validateRequest,
  createGrua
);
router.get('/', listGruas);
router.get('/:id', getGrua);
router.put(
  '/:id',
  authorizeRoles('ADMIN', 'JEFE'),
  [body('codigo').optional().notEmpty(), body('placa').optional().notEmpty()],
  validateRequest,
  updateGrua
);
router.delete('/:id', authorizeRoles('ADMIN', 'JEFE'), deleteGrua);
module.exports = router;



