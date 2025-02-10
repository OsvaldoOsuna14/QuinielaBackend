const express = require('express');
const cors = require('cors');
require('dotenv').config();

const quinielaRoutes = require('./routes/quiniela');
const partidoRoutes = require('./routes/partido');
const usuarioRoutes = require('./routes/usuario');
const prediccionesRoutes = require('./routes/predicciones');
const pagosRoutes = require('./routes/pagos');

const app = express();

app.use(cors());
app.use(express.json());


app.use('/api/quinielas', quinielaRoutes);
app.use('/api/partidos', partidoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/predicciones', prediccionesRoutes);
app.use('/api/pagos', pagosRoutes);


const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});