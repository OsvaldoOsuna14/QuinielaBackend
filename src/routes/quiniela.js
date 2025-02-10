const express = require('express');
const router = express.Router();
const quinielaController = require('../controllers/quinielaController');


router.post('/', quinielaController.crearQuiniela);
router.get('/activa', quinielaController.getQuinielaActual);
router.put('/:id/finalizar', quinielaController.finalizarQuiniela);
router.get('/historial', quinielaController.getHistorialQuinielas);
router.get('/:id/detalles', quinielaController.getDetallesQuiniela);

module.exports = router;