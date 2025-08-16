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

    // Cargar datos iniciales desde la base de datos
    async cargarDatosIniciales() {
        try {
            this.actualizarEstado({ cargando: true, error: null });
            
            const resultados = await this.servicioBaseDatos.obtenerResultados();
            const totalVotos = await this.servicioBaseDatos.obtenerTotalVotos();
            
            // Usar candidatos oficiales globales para obtener colores
            const candidatosOficiales = window.candidatosOficiales || [];
            
            // Combinar datos de BD con información de candidatos
            const candidatosConDatos = resultados.map(resultado => {
                const candidatoOficial = candidatosOficiales.find(c => c.idCandidato === resultado.id_candidato);
                return {
                    ...resultado,
                    colorPrimario: candidatoOficial ? candidatoOficial.colorPrimario : '#3498db',
                    colorSecundario: candidatoOficial ? candidatoOficial.colorSecundario : '#2980b9',
                    urlFoto: candidatoOficial ? candidatoOficial.urlFoto : null
                };
            });

            this.actualizarEstado({
                candidatos: candidatosConDatos,
                totalVotos: totalVotos,
                cargando: false
            });

        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            this.actualizarEstado({
                error: 'Error al cargar los datos de la aplicación',
                cargando: false
            });
        }
    }

    // Registrar un voto
    async registrarVoto(idCandidato) {
        try {
            this.actualizarEstado({ cargando: true, error: null });
            
            await this.servicioBaseDatos.registrarVoto(idCandidato);
            
            // Recargar datos actualizados
            await this.cargarDatosIniciales();
            
            // Notificar éxito
            this.notificarCambio('voto_registrado', { idCandidato });
            
        } catch (error) {
            console.error('Error al registrar voto:', error);
            this.actualizarEstado({
                error: 'Error al registrar el voto. Inténtalo de nuevo.',
                cargando: false
            });
        }
    }

    // Reiniciar todos los votos
    async reiniciarVotos() {
        try {
            this.actualizarEstado({ cargando: true, error: null });
            
            await this.servicioBaseDatos.reiniciarVotos();
            
            // Recargar datos
            await this.cargarDatosIniciales();
            
            // Notificar reinicio
            this.notificarCambio('votos_reiniciados');
            
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
