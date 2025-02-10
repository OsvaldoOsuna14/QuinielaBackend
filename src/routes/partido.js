const express = require('express');
const router = express.Router();
const partidoController = require('../controllers/partidoController');


router.get('/quiniela/:id', partidoController.getPartidosByQuinielaId);
router.get('/disponibles', partidoController.getPartidosDisponibles);
router.post('/', partidoController.guardarPartidos);
router.put('/:id/resultado', partidoController.actualizarResultados);
router.post('/actualizar-resultados', partidoController.actualizarResultadosAutomaticamente);
router.get('/estado', partidoController.getEstadoPartidos);
module.exports = router;
