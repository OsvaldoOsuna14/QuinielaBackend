const db = require('../config/database');

const MONTO_APUESTA = 40;

const quinielaController = {
    crearQuiniela: async (req, res) => {
        try {
            const [result] = await db.query(
                'INSERT INTO quinielas (estado, fecha_inicio, monto_apuesta) VALUES (?, NOW(), ?)',
                ['activa', MONTO_APUESTA]
            );
            
            res.json({ 
                id: result.insertId,
                message: 'Quiniela creada exitosamente' 
            });
        } catch (error) {
            console.error('Error al crear quiniela:', error);
            res.status(500).json({ error: 'Error al crear la quiniela' });
        }
    },

    getQuinielaActual: async (req, res) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM quinielas WHERE estado = ? ORDER BY fecha_inicio DESC LIMIT 1',
                ['activa']
            );
            
            if (rows.length === 0) {
                return res.json(null);
            }
            
            res.json(rows[0]);
        } catch (error) {
            console.error('Error al obtener quiniela actual:', error);
            res.status(500).json({ error: 'Error al obtener la quiniela actual' });
        }
    },

    getHistorialQuinielas: async (req, res) => {
        try {
            const [quinielas] = await db.query(
                `SELECT DISTINCT 
                    q.*,
                    GROUP_CONCAT(DISTINCT u.nombre) as ganadores_nombres
                FROM quinielas q
                LEFT JOIN quiniela_ganadores qg ON q.id = qg.quiniela_id
                LEFT JOIN usuarios u ON qg.usuario_id = u.id
                WHERE q.estado = 'finalizada'
                GROUP BY q.id
                ORDER BY q.fecha_fin DESC`
            );
            const quinielasConDetalles = await Promise.all(quinielas.map(async (quiniela) => {
                const [tablaPosiciones] = await db.query(
                    `SELECT 
                        u.id as usuario_id,
                        u.nombre,
                        COUNT(DISTINCT pred.partido_id) as total_predicciones,
                        SUM(CASE 
                            WHEN p.resultado_local > p.resultado_visitante AND pred.prediccion = 'local' THEN 1
                            WHEN p.resultado_local < p.resultado_visitante AND pred.prediccion = 'visitante' THEN 1
                            WHEN p.resultado_local = p.resultado_visitante AND pred.prediccion = 'empate' THEN 1
                            ELSE 0 
                        END) as aciertos,
                        ROUND(
                            (SUM(CASE 
                                WHEN p.resultado_local > p.resultado_visitante AND pred.prediccion = 'local' THEN 1
                                WHEN p.resultado_local < p.resultado_visitante AND pred.prediccion = 'visitante' THEN 1
                                WHEN p.resultado_local = p.resultado_visitante AND pred.prediccion = 'empate' THEN 1
                                ELSE 0 
                            END) / COUNT(DISTINCT pred.partido_id)) * 100,
                            1
                        ) as porcentaje_aciertos,
                        COALESCE(qg.posicion, 0) as posicion
                    FROM usuarios u
                    LEFT JOIN predicciones pred ON pred.usuario_id = u.id
                    LEFT JOIN partidos p ON p.id = pred.partido_id
                    LEFT JOIN quiniela_ganadores qg ON qg.quiniela_id = p.quiniela_id AND qg.usuario_id = u.id
                    WHERE p.quiniela_id = ?
                    GROUP BY u.id, u.nombre, qg.posicion
                    ORDER BY aciertos DESC, porcentaje_aciertos DESC`,
                    [quiniela.id]
                );

                const [pagos] = await db.query(
                    `SELECT 
                        p.*,
                        pagador.nombre as pagador_nombre,
                        receptor.nombre as receptor_nombre
                    FROM pagos p
                    JOIN usuarios pagador ON p.usuario_pagador_id = pagador.id
                    JOIN usuarios receptor ON p.usuario_receptor_id = receptor.id
                    WHERE p.quiniela_id = ?`,
                    [quiniela.id]
                );

                return {
                    ...quiniela,
                    ganadores: quiniela.ganadores_nombres ? quiniela.ganadores_nombres.split(',') : [],
                    tabla_posiciones: tablaPosiciones,
                    pagos: pagos
                };
            }));

            res.json(quinielasConDetalles);
        } catch (error) {
            console.error('Error al obtener historial:', error);
            res.status(500).json({ error: 'Error al obtener el historial' });
        }
    },

    getDetallesQuiniela: async (req, res) => {
        try {
            const { id } = req.params;

            const [quinielas] = await db.query(
                `SELECT 
                    q.*,
                    GROUP_CONCAT(DISTINCT u.nombre) as ganadores_nombres
                FROM quinielas q
                LEFT JOIN quiniela_ganadores qg ON q.id = qg.quiniela_id
                LEFT JOIN usuarios u ON qg.usuario_id = u.id
                WHERE q.id = ?
                GROUP BY q.id`,
                [id]
            );

            if (quinielas.length === 0) {
                return res.status(404).json({ error: 'Quiniela no encontrada' });
            }

            const quiniela = quinielas[0];
            const [tablaPosiciones] = await db.query(
                `SELECT 
                    u.id as usuario_id,
                    u.nombre,
                    COUNT(DISTINCT pred.partido_id) as total_predicciones,
                    SUM(CASE 
                        WHEN p.resultado_local > p.resultado_visitante AND pred.prediccion = 'local' THEN 1
                        WHEN p.resultado_local < p.resultado_visitante AND pred.prediccion = 'visitante' THEN 1
                        WHEN p.resultado_local = p.resultado_visitante AND pred.prediccion = 'empate' THEN 1
                        ELSE 0 
                    END) as aciertos,
                    ROUND(
                        (SUM(CASE 
                            WHEN p.resultado_local > p.resultado_visitante AND pred.prediccion = 'local' THEN 1
                            WHEN p.resultado_local < p.resultado_visitante AND pred.prediccion = 'visitante' THEN 1
                            WHEN p.resultado_local = p.resultado_visitante AND pred.prediccion = 'empate' THEN 1
                            ELSE 0 
                        END) / COUNT(DISTINCT pred.partido_id)) * 100,
                        1
                    ) as porcentaje_aciertos,
                    COALESCE(qg.posicion, 0) as posicion
                FROM usuarios u
                LEFT JOIN predicciones pred ON pred.usuario_id = u.id
                LEFT JOIN partidos p ON p.id = pred.partido_id
                LEFT JOIN quiniela_ganadores qg ON qg.quiniela_id = p.quiniela_id AND qg.usuario_id = u.id
                WHERE p.quiniela_id = ?
                GROUP BY u.id, u.nombre, qg.posicion
                ORDER BY aciertos DESC, porcentaje_aciertos DESC`,
                [id]
            );
            const [pagos] = await db.query(
                `SELECT 
                    p.*,
                    pagador.nombre as pagador_nombre,
                    receptor.nombre as receptor_nombre
                FROM pagos p
                JOIN usuarios pagador ON p.usuario_pagador_id = pagador.id
                JOIN usuarios receptor ON p.usuario_receptor_id = receptor.id
                WHERE p.quiniela_id = ?`,
                [id]
            );

            res.json({
                ...quiniela,
                ganadores: quiniela.ganadores_nombres ? quiniela.ganadores_nombres.split(',') : [],
                tabla_posiciones: tablaPosiciones,
                pagos: pagos
            });

        } catch (error) {
            console.error('Error al obtener detalles:', error);
            res.status(500).json({ error: 'Error al obtener los detalles' });
        }
    },

    finalizarQuiniela: async (req, res) => {
        try {
            const { id } = req.params;
            const [participantes] = await db.query(`
                SELECT 
                    u.id,
                    u.nombre,
                    COUNT(CASE 
                        WHEN p.prediccion = 
                            CASE 
                                WHEN pt.resultado_local > pt.resultado_visitante THEN 'local'
                                WHEN pt.resultado_local < pt.resultado_visitante THEN 'visitante'
                                ELSE 'empate'
                            END 
                        THEN 1 
                        ELSE 0 
                    END) as aciertos
                FROM usuarios u
                JOIN predicciones p ON u.id = p.usuario_id
                JOIN partidos pt ON p.partido_id = pt.id
                WHERE pt.quiniela_id = ?
                GROUP BY u.id
                ORDER BY aciertos DESC`, 
                [id]
            );
    
            if (participantes.length !== 3) {
                return res.status(400).json({ error: 'La quiniela debe tener exactamente 3 participantes' });
            }
            const maxAciertos = participantes[0].aciertos;
            const ganadores = participantes.filter(p => p.aciertos === maxAciertos);
    
            await db.query('START TRANSACTION');
    
            try {
                const ganadoresValues = ganadores.map((ganador, index) => [id, ganador.id, index + 1]);
                if (ganadoresValues.length > 0) {
                    await db.query(
                        'INSERT INTO quiniela_ganadores (quiniela_id, usuario_id, posicion) VALUES ?',
                        [ganadoresValues]
                    );
                }
                if (ganadores.length === 1) {
                    const perdedores = participantes.filter(p => p.aciertos !== maxAciertos);
                    const pagosValues = perdedores.map(perdedor => [
                        id, 
                        perdedor.id, 
                        ganadores[0].id, 
                        40, 
                        'pendiente'
                    ]);
                    
                    await db.query(
                        `INSERT INTO pagos 
                         (quiniela_id, usuario_pagador_id, usuario_receptor_id, monto, estado)
                         VALUES ?`,
                        [pagosValues]
                    );
                } 
                else if (ganadores.length === 2) {
                    const perdedor = participantes.find(p => p.aciertos !== maxAciertos);
                    const pagosValues = ganadores.map(ganador => [
                        id,
                        perdedor.id,
                        ganador.id,
                        20,
                        'pendiente'
                    ]);
    
                    await db.query(
                        `INSERT INTO pagos 
                         (quiniela_id, usuario_pagador_id, usuario_receptor_id, monto, estado)
                         VALUES ?`,
                        [pagosValues]
                    );
                }
                await db.query(
                    'UPDATE quinielas SET estado = ?, fecha_fin = NOW() WHERE id = ?',
                    ['finalizada', id]
                );
                await db.query('COMMIT');
                const detalles = await this.getDetallesQuiniela({ params: { id } }, { json: data => data });
    
                res.json({
                    message: 'Quiniela finalizada exitosamente',
                    ...detalles
                });
    
            } catch (error) {
                await db.query('ROLLBACK');
                throw error;
            }
    
        } catch (error) {
            console.error('Error al finalizar quiniela:', error);
            res.status(500).json({ error: 'Error al finalizar la quiniela' });
        }
    },
};

module.exports = quinielaController;