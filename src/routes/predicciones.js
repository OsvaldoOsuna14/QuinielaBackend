const express = require('express');
const router = express.Router();
const prediccionController = require('../controllers/prediccionController');


router.post('/', prediccionController.guardarPredicciones);


router.get('/usuario/:usuarioId', prediccionController.getPrediccionesUsuario);

module.exports = router;