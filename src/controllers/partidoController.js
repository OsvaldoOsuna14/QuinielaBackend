const pool = require('../config/database');
const { stack } = require('../routes/partido');
const { getPartidosPorLiga, getResultadoPartido} = require('../services/footballApi');

const partidoController = {
  getPartidosDisponibles: async (req, res) => {
    try {
        console.log('Iniciando getPartidosDisponibles');
      const partidos = await getPartidosPorLiga();
        console.log('Partidos obtenidos', partidos);
      res.json(partidos);
    } catch (error) {
      res.status(500).json({ error: error.message,stack: error.stack } );
    }
  },
guardarPartidos: async (req, res) => {
    const { quiniela_id, partidos } = req.body;
    
    try {
      for (const partido of partidos) {
        const fechaUTC = new Date(partido.fecha);
        const fechaHermosillo = new Date(fechaUTC.getTime() - (7 * 60 * 60 * 1000));
        const fechaFormateada = fechaHermosillo.toISOString().slice(0, 19).replace('T', ' ');
        console.log('Fecha original UTC:', partido.fecha);
        console.log('Fecha Hermosillo:', fechaFormateada);

        await pool.query(
          'INSERT INTO partidos (quiniela_id, id_api, equipo_local, equipo_visitante, competicion, fecha_partido) VALUES (?, ?, ? , ?, ?, ?)',
          [
            quiniela_id,
            partido.id,
            partido.equipoLocal,
            partido.equipoVisitante,
            partido.competicion,
            fechaFormateada
          ]
        );
      }

      res.json({ 
        mensaje: 'Partidos guardados exitosamente',
        cantidad: partidos.length
      });
    } catch (error) {
      console.error('Error al guardar partidos:', error);
      res.status(500).json({ 
        error: 'Error al guardar los partidos',
        detalles: error.message,
        data: {
          fechaOriginal: partidos[0]?.fecha,
          fechaHermosillo: partidos[0]?.fecha ? 
            new Date(new Date(partidos[0].fecha).getTime() - (7 * 60 * 60 * 1000))
              .toISOString().slice(0, 19).replace('T', ' ') 
            : null
        }
      });
    }
  },
  actualizarResultados: async (req, res) => {
    const { id } = req.params;
    const { resultado_local, resultado_visitante } = req.body;
    try {
      await pool.query(
        'UPDATE partidos SET resultado_local = ?, resultado_visitante = ? WHERE id = ?',
        [resultado_local, resultado_visitante, id]
      );
      res.json({ mensaje: 'Resultado actualizado exitosamente' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
   getPartidosByQuinielaId: async (req, res) => {
    const { id } = req.params; 
    try {
      const [partidos] = await pool.query(
        'SELECT * FROM partidos WHERE quiniela_id = ?',
        [id]
      );

      if (partidos.length === 0) {
        return res.status(404).json({ mensaje: 'No se encontraron partidos para esta quiniela' });
      }

      res.json(partidos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  actualizarResultadosAutomaticamente: async (req, res) => {
    try {
      const [partidos] = await pool.query(
        'SELECT id, id_api, fecha_partido FROM partidos WHERE resultado_local IS NULL AND fecha_partido < NOW()'
      );

      const actualizaciones = [];

      for (const partido of partidos) {
        try {
          console.log(`Consultando resultado para partido ID: ${partido.id}, API_ID: ${partido.id_api}`);
          
          const resultado = await getResultadoPartido(partido.id_api);
          
          if (resultado && resultado.finalizado) {
            console.log(`Actualizando resultado: ${resultado.golesLocal}-${resultado.golesVisitante}`);
            
            await pool.query(
              'UPDATE partidos SET resultado_local = ?, resultado_visitante = ? WHERE id = ?',
              [resultado.golesLocal, resultado.golesVisitante, partido.id]
            );

            actualizaciones.push({
              partido_id: partido.id,
              resultado: `${resultado.golesLocal}-${resultado.golesVisitante}`,
              actualizado: true
            });
          } else {
            console.log(`Partido ${partido.id} aún no finalizado o sin resultado disponible`);
            actualizaciones.push({
              partido_id: partido.id,
              mensaje: 'Partido no finalizado o sin resultado disponible',
              estado: resultado?.estado || 'DESCONOCIDO',
              actualizado: false
            });
          }
        } catch (error) {
          console.error(`Error actualizando partido ${partido.id}:`, error);
          actualizaciones.push({
            partido_id: partido.id,
            error: error.message,
            actualizado: false
          });
        }
      }

      res.json({
        mensaje: 'Proceso de actualización completado',
        actualizaciones,
        total_actualizados: actualizaciones.filter(a => a.actualizado).length,
        total_pendientes: actualizaciones.filter(a => !a.actualizado).length
      });
    } catch (error) {
      console.error('Error en actualización automática:', error);
      res.status(500).json({ 
        error: 'Error al actualizar resultados',
        detalles: error.message
      });
    }
  },

  getEstadoPartidos: async (req, res) => {
    try {
      const [partidos] = await pool.query(`
        SELECT 
          p.id,
          p.equipo_local,
          p.equipo_visitante,
          p.fecha_partido,
          p.resultado_local,
          p.resultado_visitante,
          p.id_api
        FROM partidos p
        WHERE fecha_partido <= NOW()
        ORDER BY fecha_partido DESC
      `);

      res.json(partidos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = partidoController;