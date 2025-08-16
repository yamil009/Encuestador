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

    // Detectar si estamos en Vercel o desarrollo local
    esEntornoVercel() {
        const hostname = window.location.hostname;
        const esVercel = hostname.includes('vercel.app') || 
                        hostname.includes('vercel.com');
        const tieneBaseDatos = this.servicioBaseDatos !== null;
        
        console.log('Detección de entorno:', {
            hostname,
            esVercel,
            tieneBaseDatos,
            usarVercel: esVercel || !tieneBaseDatos
        });
        
        return esVercel || !tieneBaseDatos;
    }

    // Cargar datos iniciales - SQLite local o localStorage en Vercel
    async cargarDatosIniciales() {
        try {
            this.actualizarEstado({ cargando: true, error: null });
            
            if (this.esEntornoVercel()) {
                // En Vercel: usar localStorage
                console.log('Entorno Vercel detectado - usando localStorage');
                const votosGuardados = this.cargarVotosLocales();
                
                if (votosGuardados && votosGuardados.length > 0) {
                    this.estado.candidatos = votosGuardados;
                    this.estado.totalVotos = votosGuardados.reduce((sum, c) => sum + c.cantidad_votos, 0);
                } else {
                    // Inicializar candidatos desde modelo global
                    if (window.candidatosOficiales) {
                        this.estado.candidatos = window.candidatosOficiales.map(candidato => ({
                            ...candidato,
                            cantidad_votos: 0
                        }));
                    }
                    this.estado.totalVotos = 0;
                }
            } else {
                // En desarrollo local: usar SQLite
                console.log('Entorno local detectado - usando SQLite');
                const resultados = await this.servicioBaseDatos.obtenerResultados();
                const totalVotos = await this.servicioBaseDatos.obtenerTotalVotos();
                
                // Combinar datos de SQLite con candidatos oficiales para obtener colores y fotos
                if (window.candidatosOficiales) {
                    const candidatosConDatos = window.candidatosOficiales.map((candidatoOficial, index) => {
                        const resultadoBD = resultados.find(r => r.id_candidato === (index + 1));
                        return {
                            ...candidatoOficial,
                            id_candidato: index + 1, // Asegurar que tenga ID
                            cantidad_votos: resultadoBD ? resultadoBD.cantidad_votos : 0
                        };
                    });
                    this.estado.candidatos = candidatosConDatos;
                    console.log('Candidatos con datos combinados:', candidatosConDatos.map(c => ({nombre: c.nombre, id: c.id_candidato})));
                } else {
                    this.estado.candidatos = resultados;
                }
                this.estado.totalVotos = totalVotos;
            }
            
            this.estado.cargando = false;
            this.notificarSuscriptores();
        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            this.estado.error = 'Error al cargar los datos de la aplicación';
            this.estado.cargando = false;
            this.notificarSuscriptores();
        }
    }

    cargarVotosLocales() {
        try {
            const votosString = localStorage.getItem('encuestas2025_votos');
            if (votosString) {
                return JSON.parse(votosString);
            }
        } catch (error) {
            console.error('Error al cargar votos locales:', error);
        }
        return null;
    }

    guardarVotosLocales() {
        try {
            localStorage.setItem('encuestas2025_votos', JSON.stringify(this.estado.candidatos));
        } catch (error) {
            console.error('Error al guardar votos locales:', error);
        }
    }

    // Registrar un voto
    async registrarVoto(idCandidato) {
        try {
            console.log('StateProvider.registrarVoto - ID recibido:', idCandidato, 'tipo:', typeof idCandidato);
            this.actualizarEstado({ cargando: true, error: null });
            
            if (this.esEntornoVercel()) {
                // En Vercel: actualizar localStorage
                const candidato = this.estado.candidatos.find(c => c.id_candidato === idCandidato);
                if (candidato) {
                    candidato.cantidad_votos++;
                    this.estado.totalVotos++;
                    this.guardarVotosLocales();
                }
            } else {
                // En desarrollo local: usar SQLite
                console.log('Enviando a SQLite - ID:', idCandidato);
                await this.servicioBaseDatos.registrarVoto(idCandidato);
                // Recargar datos actualizados desde SQLite
                await this.cargarDatosIniciales();
                return; // No continuar con el resto del código
            }
            
            this.estado.cargando = false;
            this.notificarSuscriptores();
            this.notificarCambio('voto_registrado', { idCandidato });
            
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
            
            if (this.esEntornoVercel()) {
                // En Vercel: limpiar localStorage
                this.estado.candidatos.forEach(candidato => {
                    candidato.cantidad_votos = 0;
                });
                this.estado.totalVotos = 0;
                localStorage.removeItem('encuestas2025_votos');
            } else {
                // En desarrollo local: usar SQLite
                await this.servicioBaseDatos.reiniciarVotos();
                // Recargar datos desde SQLite
                await this.cargarDatosIniciales();
                return; // No continuar con el resto del código
            }
            
            this.estado.cargando = false;
            this.notificarSuscriptores();
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
