// Provider para gestión de estado de la aplicación Encuestas2025
class ProveedorEstado {
    constructor() {
        this.estado = {
            candidatos: [],
            totalVotos: 0,
            vistaActual: 'votacion', // 'votacion' o 'resultados'
            cargando: false,
            error: null
        };
        this.suscriptores = [];
        this.servicioBaseDatos = null;
    }

    // Inicializar con servicio de base de datos
    inicializar(servicioBaseDatos) {
        this.servicioBaseDatos = servicioBaseDatos;
        this.cargarDatosIniciales();
    }

    // Cargar datos iniciales - siempre desde SQLite
    async cargarDatosIniciales() {
        // Evitar cargas múltiples
        if (this.estado.cargando) {
            console.log('Ya hay una carga en progreso, omitiendo...');
            return;
        }
        
        try {
            this.actualizarEstado({ cargando: true, error: null });
            
            console.log('Cargando datos desde SQLite');
            const resultados = await this.servicioBaseDatos.obtenerResultados();
            const totalVotos = await this.servicioBaseDatos.obtenerTotalVotos();
            
            // Combinar datos de SQLite con candidatos oficiales para obtener colores y fotos
            if (window.candidatosOficiales) {
                const candidatosConDatos = window.candidatosOficiales.map((candidatoOficial, index) => {
                    const resultadoBD = resultados.find(r => r.id_candidato === (index + 1));
                    return {
                        ...candidatoOficial,
                        id_candidato: index + 1,
                        cantidad_votos: resultadoBD ? resultadoBD.cantidad_votos : 0
                    };
                });
                this.estado.candidatos = candidatosConDatos;
                console.log('Candidatos con datos combinados:', candidatosConDatos.map(c => ({nombre: c.nombre, id: c.id_candidato, votos: c.cantidad_votos})));
            } else {
                this.estado.candidatos = resultados;
            }
            this.estado.totalVotos = totalVotos;
            
            this.estado.cargando = false;
            this.notificarSuscriptores();
        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            this.estado.error = 'Error al cargar los datos de la aplicación';
            this.estado.cargando = false;
            this.notificarSuscriptores();
        }
    }

    // Registrar un voto
    async registrarVoto(idCandidato) {
        try {
            console.log('StateProvider.registrarVoto - ID recibido:', idCandidato, 'tipo:', typeof idCandidato);
            this.actualizarEstado({ cargando: true, error: null });
            
            // Usar SQLite directo para registrar el voto
            console.log('Registrando voto en SQLite - ID:', idCandidato);
            await this.servicioBaseDatos.registrarVoto(idCandidato);
            
            // Actualizar estado local inmediatamente sin recargar
            const candidato = this.estado.candidatos.find(c => c.id_candidato === parseInt(idCandidato));
            if (candidato) {
                candidato.cantidad_votos++;
                this.estado.totalVotos++;
                console.log(`Voto actualizado localmente para ${candidato.nombre}: ${candidato.cantidad_votos} votos`);
            }
            
            this.estado.cargando = false;
            this.notificarSuscriptores();
            return;
            
        } catch (error) {
            console.error('Error al registrar voto:', error);
            this.actualizarEstado({
                error: 'Error al registrar el voto. Inténtalo de nuevo.',
                cargando: false
            });
            throw error;
        }
    }

    // Reiniciar todos los votos
    async reiniciarVotos() {
        try {
            this.actualizarEstado({ cargando: true, error: null });
            
            // Usar SQLite para reiniciar los votos
            await this.servicioBaseDatos.reiniciarVotos();
            
            // Recargar datos actualizados desde SQLite
            await this.cargarDatosIniciales();
            return;
            
        } catch (error) {
            console.error('Error al reiniciar votos:', error);
            this.actualizarEstado({
                error: 'Error al reiniciar los votos. Inténtalo de nuevo.',
                cargando: false
            });
        }
    }

    // Cambiar vista actual
    cambiarVista(nuevaVista) {
        if (['votacion', 'resultados'].includes(nuevaVista)) {
            this.actualizarEstado({ vistaActual: nuevaVista });
            this.notificarCambio('vista_cambiada', { vista: nuevaVista });
        }
    }

    // Obtener estado actual
    obtenerEstado() {
        return { ...this.estado };
    }

    // Obtener candidato por ID
    obtenerCandidato(idCandidato) {
        return this.estado.candidatos.find(c => c.id_candidato === idCandidato);
    }

    // Obtener resultados con porcentajes calculados
    obtenerResultadosConPorcentajes() {
        return this.estado.candidatos.map(candidato => ({
            ...candidato,
            porcentaje: this.estado.totalVotos > 0 
                ? ((candidato.cantidad_votos / this.estado.totalVotos) * 100).toFixed(2)
                : 0
        }));
    }

    // Suscribirse a cambios de estado
    suscribirse(callback) {
        this.suscriptores.push(callback);
        
        // Devolver función para cancelar suscripción
        return () => {
            const index = this.suscriptores.indexOf(callback);
            if (index > -1) {
                this.suscriptores.splice(index, 1);
            }
        };
    }

    // Actualizar estado interno
    actualizarEstado(cambios) {
        this.estado = { ...this.estado, ...cambios };
        this.notificarSuscriptores();
    }

    // Notificar a todos los suscriptores
    notificarSuscriptores() {
        this.suscriptores.forEach(callback => {
            try {
                callback(this.obtenerEstado());
            } catch (error) {
                console.error('Error en callback de suscriptor:', error);
            }
        });
    }

    // Notificar cambio específico
    notificarCambio(tipo, datos = {}) {
        this.suscriptores.forEach(callback => {
            try {
                if (callback.onCambio) {
                    callback.onCambio(tipo, datos);
                }
            } catch (error) {
                console.error('Error en callback de cambio:', error);
            }
        });
    }

    // Limpiar recursos
    destruir() {
        this.suscriptores = [];
        this.estado = null;
        this.servicioBaseDatos = null;
    }
}

// Instancia singleton del proveedor de estado
let instanciaProveedor = null;

function obtenerProveedorEstado() {
    if (!instanciaProveedor) {
        instanciaProveedor = new ProveedorEstado();
    }
    return instanciaProveedor;
}

// Exportar para uso en Node.js o navegador
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProveedorEstado, obtenerProveedorEstado };
} else {
    window.ProveedorEstado = ProveedorEstado;
    window.obtenerProveedorEstado = obtenerProveedorEstado;
}
