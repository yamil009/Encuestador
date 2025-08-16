const express = require('express');
const path = require('path');
const ServicioBaseDatos = require('./services/DatabaseService');

const app = express();
const puerto = process.env.PORT || 3000;

// Instancia del servicio de base de datos
let servicioBaseDatos = null;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/models', express.static(path.join(__dirname, 'models')));
app.use('/services', express.static(path.join(__dirname, 'services')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Inicializar base de datos
async function inicializarBaseDatos() {
    try {
        servicioBaseDatos = new ServicioBaseDatos();
        await servicioBaseDatos.inicializar();
        console.log('✅ Base de datos inicializada correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error);
        process.exit(1);
    }
}

// Rutas API
app.get('/api/candidatos', async (req, res) => {
    try {
        const resultados = await servicioBaseDatos.obtenerResultados();
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

        const filasAfectadas = await servicioBaseDatos.registrarVoto(parseInt(idCandidato));
        
        if (filasAfectadas > 0) {
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

app.get('/api/resultados', async (req, res) => {
    try {
        const resultados = await servicioBaseDatos.obtenerResultados();
        const totalVotos = await servicioBaseDatos.obtenerTotalVotos();
        
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

app.post('/api/reiniciar', async (req, res) => {
    try {
        const filasAfectadas = await servicioBaseDatos.reiniciarVotos();
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
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

// Manejo de cierre graceful
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando servidor...');
    
    if (servicioBaseDatos) {
        await servicioBaseDatos.cerrarConexion();
    }
    
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🔄 Cerrando servidor por SIGTERM...');
    
    if (servicioBaseDatos) {
        await servicioBaseDatos.cerrarConexion();
    }
    
    process.exit(0);
});

// Inicializar y arrancar servidor
async function iniciarServidor() {
    try {
        await inicializarBaseDatos();
        
        app.listen(puerto, () => {
            console.log('🚀 ========================================');
            console.log(`📊 Encuestas Bolivia 2025`);
            console.log(`🌐 Servidor ejecutándose en: http://localhost:${puerto}`);
            console.log(`📁 Directorio: ${__dirname}`);
            console.log(`🗄️  Base de datos: SQLite local`);
            console.log('🚀 ========================================');
            console.log('✅ Aplicación lista para recibir votos');
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Arrancar la aplicación
iniciarServidor();
