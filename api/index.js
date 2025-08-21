const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
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

// Ruta del dashboard electoral
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// API para datos del dashboard
app.get('/api/dashboard/general', async (req, res) => {
    try {
        const csvPath = path.join(__dirname, '..', 'data', 'Resultados Elecciones Nacionales 2025.csv');
        const results = [];
        
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                // Información general
                const totalMesas = results.length;
                const totalInscritos = results.reduce((sum, row) => sum + parseInt(row.InscritosHabilitados || 0), 0);
                const totalVotosEmitidos = results.reduce((sum, row) => sum + parseInt(row.VotoEmitido || 0), 0);
                const participacion = ((totalVotosEmitidos / totalInscritos) * 100).toFixed(2);
                
                // Departamentos únicos
                const departamentos = [...new Set(results.map(row => row.NombreDepartamento))];
                
                res.json({
                    success: true,
                    data: {
                        totalMesas,
                        totalInscritos,
                        totalVotosEmitidos,
                        participacion,
                        totalDepartamentos: departamentos.length,
                        departamentos
                    }
                });
            })
            .on('error', (error) => {
                console.error('Error leyendo CSV:', error);
                res.status(500).json({ success: false, error: 'Error al leer datos electorales' });
            });
    } catch (error) {
        console.error('Error en dashboard general:', error);
        res.status(500).json({ success: false, error: 'Error al obtener información general' });
    }
});

app.get('/api/dashboard/resultados-nacionales', async (req, res) => {
    try {
        const csvPath = path.join(__dirname, '..', 'data', 'Resultados Elecciones Nacionales 2025.csv');
        const results = [];
        
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                // Sumar votos por candidato a nivel nacional
                const candidatos = {};
                for (let i = 1; i <= 12; i++) {
                    candidatos[`Candidato ${i}`] = 0;
                }
                
                results.forEach(row => {
                    for (let i = 1; i <= 12; i++) {
                        const votos = parseInt(row[`Voto${i}`] || 0);
                        candidatos[`Candidato ${i}`] += votos;
                    }
                });
                
                // Convertir a array y ordenar
                const resultadosArray = Object.entries(candidatos)
                    .map(([nombre, votos]) => ({ nombre, votos }))
                    .filter(item => item.votos > 0)
                    .sort((a, b) => b.votos - a.votos);
                
                const totalVotos = resultadosArray.reduce((sum, item) => sum + item.votos, 0);
                
                // Agregar porcentajes
                const resultadosConPorcentaje = resultadosArray.map(item => ({
                    ...item,
                    porcentaje: ((item.votos / totalVotos) * 100).toFixed(2)
                }));
                
                res.json({
                    success: true,
                    data: {
                        resultados: resultadosConPorcentaje,
                        totalVotos
                    }
                });
            })
            .on('error', (error) => {
                console.error('Error leyendo CSV:', error);
                res.status(500).json({ success: false, error: 'Error al leer resultados nacionales' });
            });
    } catch (error) {
        console.error('Error en resultados nacionales:', error);
        res.status(500).json({ success: false, error: 'Error al obtener resultados nacionales' });
    }
});

app.get('/api/dashboard/recinto/:departamento/:municipio/:recinto', async (req, res) => {
    try {
        const { departamento, municipio, recinto } = req.params;
        const csvPath = path.join(__dirname, '..', 'data', 'Resultados Elecciones Nacionales 2025.csv');
        const results = [];
        
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                // Filtrar por recinto específico
                const recintoData = results.filter(row => 
                    row.NombreDepartamento === departamento &&
                    row.NombreMunicipio === municipio &&
                    row.NombreRecinto === recinto
                );
                
                if (recintoData.length === 0) {
                    return res.json({
                        success: false,
                        error: 'Recinto no encontrado'
                    });
                }
                
                // Sumar votos por candidato en este recinto
                const candidatos = {};
                for (let i = 1; i <= 12; i++) {
                    candidatos[`Candidato ${i}`] = 0;
                }
                
                let totalInscritos = 0;
                let totalVotosEmitidos = 0;
                
                recintoData.forEach(row => {
                    totalInscritos += parseInt(row.InscritosHabilitados || 0);
                    totalVotosEmitidos += parseInt(row.VotoEmitido || 0);
                    
                    for (let i = 1; i <= 12; i++) {
                        const votos = parseInt(row[`Voto${i}`] || 0);
                        candidatos[`Candidato ${i}`] += votos;
                    }
                });
                
                const resultadosArray = Object.entries(candidatos)
                    .map(([nombre, votos]) => ({ nombre, votos }))
                    .filter(item => item.votos > 0)
                    .sort((a, b) => b.votos - a.votos);
                
                const totalVotos = resultadosArray.reduce((sum, item) => sum + item.votos, 0);
                const participacion = ((totalVotosEmitidos / totalInscritos) * 100).toFixed(2);
                
                res.json({
                    success: true,
                    data: {
                        recinto: {
                            departamento,
                            municipio,
                            recinto,
                            totalMesas: recintoData.length,
                            totalInscritos,
                            totalVotosEmitidos,
                            participacion
                        },
                        resultados: resultadosArray.map(item => ({
                            ...item,
                            porcentaje: ((item.votos / totalVotos) * 100).toFixed(2)
                        }))
                    }
                });
            })
            .on('error', (error) => {
                console.error('Error leyendo CSV:', error);
                res.status(500).json({ success: false, error: 'Error al leer datos del recinto' });
            });
    } catch (error) {
        console.error('Error en datos del recinto:', error);
        res.status(500).json({ success: false, error: 'Error al obtener datos del recinto' });
    }
});

app.get('/api/dashboard/ubicaciones', async (req, res) => {
    try {
        const csvPath = path.join(__dirname, '..', 'data', 'Resultados Elecciones Nacionales 2025.csv');
        const results = [];
        
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                const ubicaciones = {};
                
                results.forEach(row => {
                    const dept = row.NombreDepartamento;
                    const muni = row.NombreMunicipio;
                    const recinto = row.NombreRecinto;
                    
                    if (!ubicaciones[dept]) {
                        ubicaciones[dept] = {};
                    }
                    if (!ubicaciones[dept][muni]) {
                        ubicaciones[dept][muni] = new Set();
                    }
                    ubicaciones[dept][muni].add(recinto);
                });
                
                // Convertir Sets a arrays
                const ubicacionesArray = {};
                Object.keys(ubicaciones).forEach(dept => {
                    ubicacionesArray[dept] = {};
                    Object.keys(ubicaciones[dept]).forEach(muni => {
                        ubicacionesArray[dept][muni] = Array.from(ubicaciones[dept][muni]);
                    });
                });
                
                res.json({
                    success: true,
                    data: ubicacionesArray
                });
            })
            .on('error', (error) => {
                console.error('Error leyendo CSV:', error);
                res.status(500).json({ success: false, error: 'Error al leer ubicaciones' });
            });
    } catch (error) {
        console.error('Error en ubicaciones:', error);
        res.status(500).json({ success: false, error: 'Error al obtener ubicaciones' });
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
