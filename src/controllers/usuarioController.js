// src/controllers/usuarioController.js
const db = require('../config/database');

const usuarioController = {
    getUsuarios: async (req, res) => {
        try {
            console.log('Iniciando consulta de usuarios...');
            const [rows] = await db.query(
                'SELECT id, nombre FROM usuarios ORDER BY nombre'
            );
            
            console.log('Usuarios encontrados:', rows);
            res.json(rows);
            
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            res.status(500).json({ error: 'Error al obtener usuarios' });
        }
    },
};

module.exports = usuarioController;