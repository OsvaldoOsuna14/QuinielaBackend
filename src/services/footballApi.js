const axios = require("axios");
require("dotenv").config();


const LIGAS = [
  { id: "PD", nombre: "Primera División" },
  { id: "PL", nombre: "Premier League" },
  { id: "BL1", nombre: "Bundesliga" },
  { id: "SA", nombre: "Serie A" },
  { id: "FL1", nombre: "Ligue 1" },
  { id: "CL", nombre: "Champions League" },
{ id: "DED", nombre: "Eredivisie" },
{ id: "PPL", nombre: "Primeira Liga" },
];


const formatearPartido = (match, nombreLiga) => ({
  id: match.id,
  competicion: nombreLiga,
  liga_id: match.competition?.id,
  equipoLocal: match.homeTeam.name,
  equipoVisitante: match.awayTeam.name,
  fecha: new Date(match.utcDate).toISOString(),
  estado: match.status,
  resultado: match.score?.fullTime ? {
    local: match.score.fullTime.home,
    visitante: match.score.fullTime.away
  } : null
});

const getPartidosPorLiga = async () => {
  try {
    const hoy = new Date();
    const inicioDeSemana = new Date(hoy);
    const finDeSemana = new Date(hoy);
    
    inicioDeSemana.setDate(hoy.getDate() - hoy.getDay() + 1);
    inicioDeSemana.setHours(0, 0, 0, 0);
    finDeSemana.setDate(inicioDeSemana.getDate() + 6);
    finDeSemana.setHours(23, 59, 59, 999);

    const dateFrom = inicioDeSemana.toISOString().split("T")[0];
    const dateTo = finDeSemana.toISOString().split("T")[0];


    const partidosPromesas = LIGAS.map(async (liga) => {
      try {
        const response = await axios.get(
          `http://api.football-data.org/v4/competitions/${liga.id}/matches`,
          {
            headers: {
              "X-Auth-Token": process.env.FOOTBALL_API_KEY,
            },
            params: {
              dateFrom: dateFrom,
              dateTo: dateTo,
              status: "SCHEDULED,LIVE,FINISHED", 
            },
          }
        );

  
        return response.data.matches.map(match => formatearPartido(match, liga.nombre));
      } catch (error) {
        console.error(
          `Error al obtener partidos de ${liga.nombre}:`,
          error.message
        );
        return [];
      }
    });


    const todosLosPartidos = await Promise.all(partidosPromesas);
    

    const partidosFinales = todosLosPartidos.flat()
      .filter(partido => new Date(partido.fecha) >= new Date());

    console.log(`Total de partidos futuros encontrados: ${partidosFinales.length}`);
    return partidosFinales;
  } catch (error) {
    console.error("Error general:", error.message);
    throw new Error("Error al obtener partidos de la API");
  }
};

const getResultadoPartido = async (matchId) => {
  try {
    const response = await axios.get(
      `http://api.football-data.org/v4/matches/${matchId}`,
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_API_KEY,
        }
      }
    );

    const match = response.data;
    if (match.status === 'FINISHED' && match.score && match.score.fullTime) {
      return {
        id: match.id,
        golesLocal: match.score.fullTime.home,
        golesVisitante: match.score.fullTime.away,
        finalizado: true,
        estado: match.status,
        equipoLocal: match.homeTeam.name,
        equipoVisitante: match.awayTeam.name,
        fecha: match.utcDate,
        competicion: match.competition.name
      };
    } else {
      return {
        id: match.id,
        finalizado: false,
        estado: match.status,
        equipoLocal: match.homeTeam.name,
        equipoVisitante: match.awayTeam.name,
        fecha: match.utcDate,
        competicion: match.competition.name,
        mensaje: `Partido en estado: ${match.status}`
      };
    }
  } catch (error) {
    console.error(`Error al obtener resultado del partido ${matchId}:`, error.message);

    if (error.response?.status === 429) {
      throw new Error('Se ha excedido el límite de peticiones a la API.');
    } else if (error.response?.status === 404) {
      throw new Error('Partido no encontrado en la API.');
    } else {
      throw new Error(`Error al obtener resultado: ${error.message}`);
    }
  }
};

const getResultadosMultiples = async (matchIds) => {
  try {
    const resultados = await Promise.all(
      matchIds.map(async (id, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 1000));
        
        try {
          return await getResultadoPartido(id);
        } catch (error) {
          console.error(`Error al obtener resultado para partido ${id}:`, error);
          return {
            id,
            error: error.message,
            finalizado: false,
            estado: 'ERROR'
          };
        }
      })
    );

    const resultadosValidos = resultados.filter(r => !r.error);
    const resultadosConError = resultados.filter(r => r.error);


    console.log(`Resultados obtenidos: ${resultadosValidos.length}`);
    if (resultadosConError.length > 0) {
      console.log(`Errores encontrados: ${resultadosConError.length}`);
    }

    return {
      resultados: resultadosValidos,
      errores: resultadosConError,
      total: resultados.length,
      exitosos: resultadosValidos.length,
      fallidos: resultadosConError.length
    };
  } catch (error) {
    console.error("Error al obtener múltiples resultados:", error);
    throw new Error("Error al obtener resultados múltiples");
  }
};

const verificarEstadoAPI = async () => {
  try {
    const response = await axios.get(
      'http://api.football-data.org/v4/status',
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_API_KEY,
        }
      }
    );
    return {
      status: 'OK',
      requestsAvailable: response.headers['x-requests-available-minute'],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  getPartidosPorLiga,
  getResultadoPartido,
  getResultadosMultiples,
  verificarEstadoAPI,
  LIGAS
};