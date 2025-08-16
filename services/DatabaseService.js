const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class ServicioBaseDatos {
    constructor() {
        this.rutaBaseDatos = path.join(__dirname, '..', 'encuestas2025.db');
        this.db = null;
        this.inicializar();
    }

    // Inicializar la base de datos
    inicializar() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.rutaBaseDatos, (err) => {
                if (err) {
                    console.error('Error al conectar con la base de datos:', err.message);
                    reject(err);
                } else {
                    console.log('Conectado a la base de datos SQLite.');
                    this.crearTablas().then(resolve).catch(reject);
                }
            });
        });
    }

    // Crear tabla de votos
    crearTablas() {
        return new Promise((resolve, reject) => {
            const sqlCrearTabla = `
                CREATE TABLE IF NOT EXISTS votos (
                    id_candidato INTEGER PRIMARY KEY,
                    nombre TEXT NOT NULL,
                    partido TEXT NOT NULL,
                    cantidad_votos INTEGER DEFAULT 0
                )
            `;

            this.db.run(sqlCrearTabla, (err) => {
                if (err) {
                    console.error('Error al crear tabla:', err.message);
                    reject(err);
                } else {
                    console.log('Tabla votos creada o ya existe.');
                    this.inicializarCandidatos().then(resolve).catch(reject);
                }
            });
        });
    }

    // Inicializar candidatos en la base de datos
    inicializarCandidatos() {
        const { candidatosOficiales } = require('../models/Candidato');
        
        return new Promise((resolve, reject) => {
            const sqlInsertar = `
                INSERT OR IGNORE INTO votos (id_candidato, nombre, partido, cantidad_votos)
                VALUES (?, ?, ?, 0)
            `;

            const stmt = this.db.prepare(sqlInsertar);
            
            candidatosOficiales.forEach(candidato => {
                stmt.run([candidato.idCandidato, candidato.nombre, candidato.partido]);
            });

            stmt.finalize((err) => {
                if (err) {
                    console.error('Error al inicializar candidatos:', err.message);
                    reject(err);
                } else {
                    console.log('Candidatos inicializados en la base de datos.');
                    resolve();
                }
            });
        });
    }

    // Registrar un voto
    registrarVoto(idCandidato) {
        return new Promise((resolve, reject) => {
            const sqlActualizar = `
                UPDATE votos 
                SET cantidad_votos = cantidad_votos + 1 
                WHERE id_candidato = ?
            `;

            this.db.run(sqlActualizar, [idCandidato], function(err) {
                if (err) {
                    console.error('Error al registrar voto:', err.message);
                    reject(err);
                } else {
                    console.log(`Voto registrado para candidato ${idCandidato}. Filas afectadas: ${this.changes}`);
                    resolve(this.changes);
                }
            });
        });
    }

    // Obtener todos los resultados
    obtenerResultados() {
        return new Promise((resolve, reject) => {
            const sqlConsulta = `
                SELECT id_candidato, nombre, partido, cantidad_votos
                FROM votos
                ORDER BY cantidad_votos DESC
            `;

            this.db.all(sqlConsulta, [], (err, filas) => {
                if (err) {
                    console.error('Error al obtener resultados:', err.message);
                    reject(err);
                } else {
                    resolve(filas);
                }
            });
        });
    }

    // Obtener total de votos
    obtenerTotalVotos() {
        return new Promise((resolve, reject) => {
            const sqlTotal = `
                SELECT SUM(cantidad_votos) as total
                FROM votos
            `;

            this.db.get(sqlTotal, [], (err, fila) => {
                if (err) {
                    console.error('Error al obtener total de votos:', err.message);
                    reject(err);
                } else {
                    resolve(fila.total || 0);
                }
            });
        });
    }

    // Reiniciar todos los votos
    reiniciarVotos() {
        return new Promise((resolve, reject) => {
            const sqlReiniciar = `
                UPDATE votos 
                SET cantidad_votos = 0
            `;

            this.db.run(sqlReiniciar, [], function(err) {
                if (err) {
                    console.error('Error al reiniciar votos:', err.message);
                    reject(err);
                } else {
                    console.log(`Votos reiniciados. Filas afectadas: ${this.changes}`);
                    resolve(this.changes);
                }
            });
        });
    }

    // Cerrar conexión
    cerrarConexion() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error al cerrar la base de datos:', err.message);
                        reject(err);
                    } else {
                        console.log('Conexión a la base de datos cerrada.');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = ServicioBaseDatos;
