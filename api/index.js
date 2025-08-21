const express = require('express');
const path = require('path');
const ServicioBaseDatos = require('../services/DatabaseService');

const app = express();
const db = new ServicioBaseDatos();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/models', express.static(path.join(__dirname, '..', 'models')));
app.use('/services', express.static(path.join(__dirname, '..', 'services')));
app.use('/views', express.static(path.join(__dirname, '..', 'views')));

// Rutas API
app.get('/api/candidatos', async (req, res) => {
    try {
        const resultados = await db.obtenerResultados();
        res.json({
            success: true,
            data: resultados
        });
    } catch (error) {
        console.error('Error al obtener candidatos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los candidatos'
        });
    }
});

app.post('/api/votar', async (req, res) => {
    try {
        const { idCandidato } = req.body;
        
        if (!idCandidato || isNaN(idCandidato)) {
            return res.status(400).json({
                success: false,
                error: 'ID de candidato inválido'
            });
        }

        const id = parseInt(idCandidato);
        
        try {
            await db.registrarVoto(id);
            console.log(`Voto registrado para candidato ${id}`);
            res.json({
                success: true,
                message: 'Voto registrado exitosamente'
            });
        } catch (err) {
            if (err.message.includes('no encontrado')) {
                res.status(404).json({
                    success: false,
                    error: 'Candidato no encontrado'
                });
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error('Error al registrar voto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar el voto'
        });
    }
});

app.get('/api/resultados', async (req, res) => {
    try {
        const resultados = await db.obtenerResultados();
        const totalVotos = await db.obtenerTotalVotos();
        
        const resultadosConPorcentajes = resultados.map(candidato => ({
            ...candidato,
            porcentaje: totalVotos > 0 
                ? ((candidato.cantidad_votos / totalVotos) * 100).toFixed(2)
                : 0
        }));

        console.log('Resultados enviados:', resultadosConPorcentajes.map(c => ({id: c.id_candidato, votos: c.cantidad_votos})));
        
        res.json({
            success: true,
            data: {
                resultados: resultadosConPorcentajes,
                totalVotos: totalVotos
            }
        });
    } catch (error) {
        console.error('Error al obtener resultados:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los resultados'
        });
    }
});

app.post('/api/reiniciar', async (req, res) => {
    try {
        const filasAfectadas = await db.reiniciarVotos();
        
        console.log('Votos reiniciados exitosamente');
        res.json({
            success: true,
            message: 'Votos reiniciados exitosamente',
            filasAfectadas: filasAfectadas
        });
    } catch (error) {
        console.error('Error al reiniciar votos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al reiniciar los votos'
        });
    }
});

// Ruta principal - servir aplicación
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada'
    });
});

// Manejo de errores generales
app.use((error, req, res, next) => {
    console.error('Error del servidor:', error);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
    });
});

module.exports = app;
