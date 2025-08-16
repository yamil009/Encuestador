const express = require('express');
const path = require('path');

const app = express();

// Almacenamiento en memoria para Vercel (se reinicia en cada deploy)
let votosEnMemoria = {
    1: { id_candidato: 1, nombre: 'Jorge Quiroga Ramírez', partido: 'Alianza Libre', cantidad_votos: 0 },
    2: { id_candidato: 2, nombre: 'Samuel Doria Medina', partido: 'Alianza Unidad', cantidad_votos: 0 },
    3: { id_candidato: 3, nombre: 'Rodrigo Paz Pereira', partido: 'Partido Demócrata Cristiano', cantidad_votos: 0 },
    4: { id_candidato: 4, nombre: 'Manfred Reyes Villa', partido: 'APB Súmate', cantidad_votos: 0 },
    5: { id_candidato: 5, nombre: 'Andrónico Rodríguez', partido: 'Alianza Popular', cantidad_votos: 0 },
    6: { id_candidato: 6, nombre: 'Jhonny Fernández', partido: 'Unidad Cívica Solidaridad', cantidad_votos: 0 },
    7: { id_candidato: 7, nombre: 'Eduardo Del Castillo', partido: 'Movimiento al Socialismo', cantidad_votos: 0 },
    8: { id_candidato: 8, nombre: 'Pavel Aracena Vargas', partido: 'Alianza Libertad y Progreso', cantidad_votos: 0 }
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/models', express.static(path.join(__dirname, '..', 'models')));
app.use('/services', express.static(path.join(__dirname, '..', 'services')));
app.use('/views', express.static(path.join(__dirname, '..', 'views')));

// Rutas API
app.get('/api/candidatos', (req, res) => {
    try {
        const resultados = Object.values(votosEnMemoria);
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

app.post('/api/votar', (req, res) => {
    try {
        const { idCandidato } = req.body;
        
        if (!idCandidato || isNaN(idCandidato)) {
            return res.status(400).json({
                success: false,
                error: 'ID de candidato inválido'
            });
        }

        const id = parseInt(idCandidato);
        if (votosEnMemoria[id]) {
            votosEnMemoria[id].cantidad_votos++;
            res.json({
                success: true,
                message: 'Voto registrado exitosamente'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Candidato no encontrado'
            });
        }
    } catch (error) {
        console.error('Error al registrar voto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar el voto'
        });
    }
});

app.get('/api/resultados', (req, res) => {
    try {
        const resultados = Object.values(votosEnMemoria);
        const totalVotos = resultados.reduce((sum, candidato) => sum + candidato.cantidad_votos, 0);
        
        const resultadosConPorcentajes = resultados.map(candidato => ({
            ...candidato,
            porcentaje: totalVotos > 0 
                ? ((candidato.cantidad_votos / totalVotos) * 100).toFixed(2)
                : 0
        }));

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

app.post('/api/reiniciar', (req, res) => {
    try {
        Object.keys(votosEnMemoria).forEach(id => {
            votosEnMemoria[id].cantidad_votos = 0;
        });
        
        res.json({
            success: true,
            message: 'Votos reiniciados exitosamente',
            filasAfectadas: Object.keys(votosEnMemoria).length
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
