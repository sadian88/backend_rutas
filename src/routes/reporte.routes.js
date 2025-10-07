const { Router } = require('express');
const { generarBalance } = require('../controllers/reporteController');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const router = Router();
router.get('/balance', authMiddleware, authorizeRoles('ADMIN'), generarBalance);
module.exports = router;


