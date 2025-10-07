const { Router } = require('express');
const { body, param } = require('express-validator');
const {
  createRuta,
  listRutas,
  getRuta,
  updateRuta,
  registrarGasto,
  listarGastosRuta,
  actualizarGasto,
  eliminarGasto,
  registrarRecarga,
  listarRecargasRuta,
  actualizarRecarga,
  eliminarRecarga,
  obtenerResumenConductor,
  obtenerResumenJefe,
} = require('../controllers/rutaController');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const router = Router();
router.use(authMiddleware);
router.post(
  '/',
  authorizeRoles('ADMIN', 'JEFE'),
  [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('sedeOrigen').isInt({ gt: 0 }).withMessage('Debe indicar la sede de origen'),
    body('sedeDestino').isInt({ gt: 0 }).withMessage('Debe indicar la sede de destino'),
    body('grua').isInt({ gt: 0 }).withMessage('Debe indicar la grua'),
    body('conductor').isInt({ gt: 0 }).withMessage('Debe indicar el conductor'),
    body('fechaInicio').notEmpty().withMessage('Debe indicar la fecha de inicio'),
  ],
  validateRequest,
  createRuta
);
router.get('/', listRutas);
router.get('/resumen/conductor', authorizeRoles('CONDUCTOR'), obtenerResumenConductor);
router.get('/resumen/jefe', authorizeRoles('JEFE'), obtenerResumenJefe);
router.get('/:id', getRuta);
router.put(
  '/:id',
  authorizeRoles('ADMIN', 'JEFE'),
  [
    body('nombre').optional().notEmpty(),
    body('estado').optional().isIn(['PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA']),
  ],
  validateRequest,
  updateRuta
);
router.post(
  '/:id/gastos',
  authorizeRoles('ADMIN', 'CONDUCTOR'),
  [
    body('descripcion').notEmpty().withMessage('La descripcion es obligatoria'),
    body('categoria').notEmpty().withMessage('La categoria es obligatoria'),
    body('monto').isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a 0'),
  ],
  validateRequest,
  registrarGasto
);
router.get('/:id/gastos', listarGastosRuta);
router.put(
  '/:id/gastos/:gastoId',
  authorizeRoles('ADMIN', 'CONDUCTOR'),
  [
    param('gastoId').isInt({ gt: 0 }).withMessage('El identificador del gasto es invalido'),
    body('descripcion').optional().notEmpty(),
    body('categoria').optional().isIn(['PEAJE', 'COMBUSTIBLE', 'ALIMENTACION', 'HOSPEDAJE', 'MANTENIMIENTO', 'OTRO']),
    body('monto').optional().isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a 0'),
    body('fecha').optional().isISO8601().withMessage('La fecha es invalida'),
  ],
  validateRequest,
  actualizarGasto
);
router.delete(
  '/:id/gastos/:gastoId',
  authorizeRoles('ADMIN', 'CONDUCTOR'),
  [param('gastoId').isInt({ gt: 0 }).withMessage('El identificador del gasto es invalido')],
  validateRequest,
  eliminarGasto
);
router.post(
  '/:id/recargas',
  authorizeRoles('ADMIN', 'JEFE'),
  [
    body('descripcion').notEmpty().withMessage('La descripcion es obligatoria'),
    body('monto').isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a 0'),
  ],
  validateRequest,
  registrarRecarga
);
router.get('/:id/recargas', listarRecargasRuta);
router.put(
  '/:id/recargas/:recargaId',
  authorizeRoles('ADMIN', 'JEFE'),
  [
    param('recargaId').isInt({ gt: 0 }).withMessage('El identificador de la recarga es invalido'),
    body('descripcion').optional().notEmpty(),
    body('monto').optional().isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a 0'),
    body('fecha').optional().isISO8601().withMessage('La fecha es invalida'),
  ],
  validateRequest,
  actualizarRecarga
);
router.delete(
  '/:id/recargas/:recargaId',
  authorizeRoles('ADMIN', 'JEFE'),
  [param('recargaId').isInt({ gt: 0 }).withMessage('El identificador de la recarga es invalido')],
  validateRequest,
  eliminarRecarga
);
module.exports = router;




