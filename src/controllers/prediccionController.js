// src/controllers/prediccionController.js
const db = require('../config/database');

const prediccionController = {
    guardarPredicciones: async (req, res) => {
        try {
            console.log('Iniciando guardado de predicciones...', req.body);
            const predicciones = req.body;

            for (const prediccion of predicciones) {
                const { partido_id, usuario_id, prediccion: resultado } = prediccion;

                const [existingPredictions] = await db.query(
                    'SELECT id FROM predicciones WHERE partido_id = ? AND usuario_id = ?',
                    [partido_id, usuario_id]
                );

                if (existingPredictions.length > 0) {
                    await db.query(
                        'UPDATE predicciones SET prediccion = ? WHERE partido_id = ? AND usuario_id = ?',
                        [resultado, partido_id, usuario_id]
                    );
                    console.log(`Predicción actualizada para partido ${partido_id} y usuario ${usuario_id}`);
                } else {
                    await db.query(
                        'INSERT INTO predicciones (partido_id, usuario_id, prediccion) VALUES (?, ?, ?)',
                        [partido_id, usuario_id, resultado]
                    );
                    console.log(`Nueva predicción insertada para partido ${partido_id} y usuario ${usuario_id}`);
                }
            }

            console.log('Todas las predicciones fueron guardadas exitosamente');
            res.json({ message: 'Predicciones guardadas exitosamente' });

        } catch (error) {
            console.error('Error al guardar predicciones:', error);
            res.status(500).json({ 
                error: 'Error al guardar las predicciones',
                details: error.message 
            });
        }
    },

    getPrediccionesUsuario: async (req, res) => {
        try {
            const usuario_id = req.params.usuarioId;
            console.log('Consultando predicciones del usuario:', usuario_id);

            const [rows] = await db.query(
                `SELECT p.*, pa.equipo_local, pa.equipo_visitante 
                 FROM predicciones p
                 JOIN partidos pa ON p.partido_id = pa.id
                 WHERE p.usuario_id = ?`,
                [usuario_id]
            );

            console.log('Predicciones encontradas:', rows);
            res.json(rows);

        } catch (error) {
            console.error('Error al obtener predicciones:', error);
            res.status(500).json({ 
                error: 'Error al obtener las predicciones',
                details: error.message 
            });
        }
    }
};

module.exports = prediccionController;