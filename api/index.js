const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();

// Configurar SQLite para Vercel
const dbPath = path.join('/tmp', 'encuestas2025.db');
let db;

// Inicializar base de datos SQLite
function inicializarBaseDatos() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error al conectar con SQLite:', err);
                reject(err);
                return;
            }
            
            console.log('Conectado a SQLite en:', dbPath);
            
            // Crear tabla si no existe
            db.run(`CREATE TABLE IF NOT EXISTS votos (
                id_candidato INTEGER PRIMARY KEY,
                nombre TEXT NOT NULL,
                partido TEXT NOT NULL,
                cantidad_votos INTEGER DEFAULT 0
            )`, (err) => {
                if (err) {
                    console.error('Error al crear tabla:', err);
                    reject(err);
                    return;
                }
                
                // Insertar candidatos iniciales si no existen
                const candidatos = [
                    { id: 1, nombre: 'Jorge Quiroga Ramírez', partido: 'Alianza Libre' },
                    { id: 2, nombre: 'Samuel Doria Medina', partido: 'Alianza Unidad' },
                    { id: 3, nombre: 'Rodrigo Paz Pereira', partido: 'Partido Demócrata Cristiano' },
                    { id: 4, nombre: 'Manfred Reyes Villa', partido: 'APB Súmate' },
                    { id: 5, nombre: 'Andrónico Rodríguez', partido: 'Alianza Popular' },
                    { id: 6, nombre: 'Jhonny Fernández', partido: 'Unidad Cívica Solidaridad' },
                    { id: 7, nombre: 'Eduardo Del Castillo', partido: 'Movimiento al Socialismo' },
                    { id: 8, nombre: 'Pavel Aracena Vargas', partido: 'Alianza Libertad y Progreso' }
                ];
                
                const stmt = db.prepare(`INSERT OR IGNORE INTO votos (id_candidato, nombre, partido, cantidad_votos) VALUES (?, ?, ?, 0)`);
                candidatos.forEach(candidato => {
                    stmt.run(candidato.id, candidato.nombre, candidato.partido);
                });
                stmt.finalize();
                
                console.log('Base de datos SQLite inicializada correctamente');
                resolve();
            });
        });
    });
}

// Inicializar BD al arrancar
inicializarBaseDatos().catch(console.error);

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
        if (!db) {
            await inicializarBaseDatos();
        }
        
        db.all('SELECT * FROM votos ORDER BY id_candidato', (err, rows) => {
            if (err) {
                console.error('Error al obtener candidatos:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Error al obtener los candidatos'
                });
            }
            
            res.json({
                success: true,
                data: rows
            });
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

        if (!db) {
            await inicializarBaseDatos();
        }

        const id = parseInt(idCandidato);
        
        db.run('UPDATE votos SET cantidad_votos = cantidad_votos + 1 WHERE id_candidato = ?', [id], function(err) {
            if (err) {
                console.error('Error al registrar voto:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Error al registrar el voto'
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Candidato no encontrado'
                });
            }
            
            console.log(`Voto registrado para candidato ${id}`);
            res.json({
                success: true,
                message: 'Voto registrado exitosamente'
            });
        });
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
        if (!db) {
            await inicializarBaseDatos();
        }
        
        db.all('SELECT * FROM votos ORDER BY id_candidato', (err, rows) => {
            if (err) {
                console.error('Error al obtener resultados:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Error al obtener los resultados'
                });
            }
            
            const totalVotos = rows.reduce((sum, candidato) => sum + candidato.cantidad_votos, 0);
            
            const resultadosConPorcentajes = rows.map(candidato => ({
                ...candidato,
                porcentaje: totalVotos > 0 
                    ? ((candidato.cantidad_votos / totalVotos) * 100).toFixed(2)
                    : 0
            }));

            console.log('Resultados desde SQLite:', resultadosConPorcentajes.map(c => ({id: c.id_candidato, votos: c.cantidad_votos})));
            
            res.json({
                success: true,
                data: {
                    resultados: resultadosConPorcentajes,
                    totalVotos: totalVotos
                }
            });
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
        if (!db) {
            await inicializarBaseDatos();
        }
        
        db.run('UPDATE votos SET cantidad_votos = 0', function(err) {
            if (err) {
                console.error('Error al reiniciar votos:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Error al reiniciar los votos'
                });
            }
            
            console.log(`Votos reiniciados: ${this.changes} filas afectadas`);
            res.json({
                success: true,
                message: 'Votos reiniciados exitosamente',
                filasAfectadas: this.changes
            });
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
