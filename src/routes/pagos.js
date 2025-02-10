const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagoController');

router.get('/quiniela/:quinielaId', pagosController.getPagosQuiniela);
router.put('/:id', pagosController.actualizarEstadoPago);
router.get('/deudas-generales', pagosController.getDeudasGenerales);



module.exports = router;