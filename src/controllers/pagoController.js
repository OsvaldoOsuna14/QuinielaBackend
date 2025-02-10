const db = require('../config/database');

const pagoController = {
    getPagosQuiniela: async (req, res) => {
        try {
            const { quinielaId } = req.params;
            const [pagos] = await db.query(
                `SELECT p.*, 
                    up.nombre as pagador_nombre,
                    ur.nombre as receptor_nombre,
                    COALESCE(p.fecha_actualizacion, p.fecha_creacion) as ultima_actualizacion
                FROM pagos p
                LEFT JOIN usuarios up ON p.usuario_pagador_id = up.id
                LEFT JOIN usuarios ur ON p.usuario_receptor_id = ur.id
                WHERE p.quiniela_id = ?
                ORDER BY p.fecha_creacion DESC`,
                [quinielaId]
            );

            const [tablaPosiciones] = await db.query(
                `SELECT 
                    u.id as usuario_id,
                    u.nombre,
                    qg.posicion,
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
                    ) as porcentaje_aciertos
                FROM usuarios u
                JOIN predicciones pred ON pred.usuario_id = u.id
                JOIN partidos p ON pred.partido_id = p.id
                LEFT JOIN quiniela_ganadores qg ON qg.quiniela_id = p.quiniela_id AND qg.usuario_id = u.id
                WHERE p.quiniela_id = ?
                GROUP BY u.id, u.nombre, qg.posicion
                ORDER BY aciertos DESC, porcentaje_aciertos DESC`,
                [quinielaId]
            );
            const [resumenPagos] = await db.query(
                `SELECT 
                    COUNT(*) as total_pagos,
                    SUM(CASE WHEN estado = 'pagado' THEN 1 ELSE 0 END) as pagos_completados,
                    SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pagos_pendientes,
                    SUM(monto) as monto_total,
                    SUM(CASE WHEN estado = 'pagado' THEN monto ELSE 0 END) as monto_pagado,
                    SUM(CASE WHEN estado = 'pendiente' THEN monto ELSE 0 END) as monto_pendiente
                FROM pagos
                WHERE quiniela_id = ?`,
                [quinielaId]
            );

            res.json({
                pagos,
                estadisticas: {
                    tabla_posiciones: tablaPosiciones,
                    resumen_pagos: resumenPagos[0]
                }
            });
        } catch (error) {
            console.error('Error al obtener pagos:', error);
            res.status(500).json({ error: 'Error al obtener los pagos' });
        }
    },

    actualizarEstadoPago: async (req, res) => {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            if (!['pendiente', 'pagado'].includes(estado)) {
                return res.status(400).json({ error: 'Estado de pago inválido' });
            }
            await db.query(
                'UPDATE pagos SET estado = ?, fecha_actualizacion = NOW() WHERE id = ?',
                [estado, id]
            );

            const [pago] = await db.query(
                `SELECT p.*, 
                    up.nombre as pagador_nombre,
                    ur.nombre as receptor_nombre,
                    q.id as quiniela_id,
                    COALESCE(p.fecha_actualizacion, p.fecha_creacion) as ultima_actualizacion
                FROM pagos p
                LEFT JOIN usuarios up ON p.usuario_pagador_id = up.id
                LEFT JOIN usuarios ur ON p.usuario_receptor_id = ur.id
                LEFT JOIN quinielas q ON p.quiniela_id = q.id
                WHERE p.id = ?`,
                [id]
            );

            if (pago.length === 0) {
                return res.status(404).json({ error: 'Pago no encontrado' });
            }

            res.json({
                message: 'Estado de pago actualizado correctamente',
                pago: pago[0]
            });
        } catch (error) {
            console.error('Error al actualizar pago:', error);
            res.status(500).json({ error: 'Error al actualizar el estado del pago' });
        }
    },

    getDeudasGenerales: async (req, res) => {
        try {
            const [usuarios] = await db.query(
                'SELECT id, nombre FROM usuarios ORDER BY nombre'
            );
            const [deudas] = await db.query(`
                SELECT 
                    p.usuario_pagador_id,
                    p.usuario_receptor_id,
                    SUM(CASE WHEN p.estado = 'pendiente' THEN p.monto ELSE 0 END) as monto_pendiente,
                    COUNT(DISTINCT p.quiniela_id) as quinielas_pendientes
                FROM pagos p
                WHERE p.estado = 'pendiente'
                GROUP BY p.usuario_pagador_id, p.usuario_receptor_id
            `);
            const [resumen] = await db.query(`
                SELECT 
                    SUM(CASE WHEN estado = 'pendiente' THEN monto ELSE 0 END) as monto_total_pendiente,
                    COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as total_pagos_pendientes,
                    COUNT(DISTINCT CASE WHEN estado = 'pendiente' THEN quiniela_id END) as quinielas_con_pagos_pendientes
                FROM pagos
            `);
            const deudas_por_usuario = deudas.map(d => ({
                usuario_id: d.usuario_pagador_id,
                debe_a: d.usuario_receptor_id,
                monto_pendiente: parseFloat(d.monto_pendiente),
                quinielas_pendientes: d.quinielas_pendientes
            }));
    
            res.json({
                usuarios,
                deudas_por_usuario,
                resumen: resumen[0]
            });
            
        } catch (error) {
            console.error('Error al obtener deudas generales:', error);
            res.status(500).json({ error: 'Error al obtener las deudas generales' });
        }
    }
};

module.exports = pagoController;