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

    // Cargar datos iniciales - siempre desde SQLite (local directo, Vercel vía API)
    async cargarDatosIniciales() {
        // Evitar cargas múltiples
        if (this.estado.cargando) {
            console.log('Ya hay una carga en progreso, omitiendo...');
            return;
        }
        
        try {
            this.actualizarEstado({ cargando: true, error: null });
            
            if (this.esEntornoVercel()) {
                // En Vercel: cargar desde servidor
                console.log('Entorno Vercel detectado - cargando desde servidor');
                const respuesta = await fetch('/api/resultados');
                const datos = await respuesta.json();
                
                if (datos.success && datos.data.resultados) {
                    // Combinar datos del servidor con candidatos oficiales
                    if (window.candidatosOficiales) {
                        const candidatosConDatos = window.candidatosOficiales.map((candidatoOficial, index) => {
                            const resultadoServidor = datos.data.resultados.find(r => r.id_candidato === (index + 1));
                            return {
                                ...candidatoOficial,
                                id_candidato: index + 1,
                                cantidad_votos: resultadoServidor ? resultadoServidor.cantidad_votos : 0
                            };
                        });
                        this.estado.candidatos = candidatosConDatos;
                        this.estado.totalVotos = datos.data.totalVotos || 0;
                        console.log('Datos cargados desde servidor:', candidatosConDatos.map(c => ({nombre: c.nombre, votos: c.cantidad_votos})));
                    }
                } else {
                    throw new Error('Error en respuesta del servidor');
                }
            } else {
                // En desarrollo local: usar SQLite directo
                console.log('Entorno local detectado - usando SQLite directo');
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


    // Registrar un voto
    async registrarVoto(idCandidato) {
        try {
            console.log('StateProvider.registrarVoto - ID recibido:', idCandidato, 'tipo:', typeof idCandidato);
            this.actualizarEstado({ cargando: true, error: null });
            
            if (this.esEntornoVercel()) {
                // En Vercel: enviar al servidor y actualizar estado local
                console.log('Enviando voto a SQLite vía servidor Vercel - ID:', idCandidato);
                const respuesta = await fetch('/api/votar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ idCandidato: parseInt(idCandidato) })
                });
                
                const datos = await respuesta.json();
                console.log('Respuesta del servidor:', datos);
                
                if (!datos.success) {
                    throw new Error(datos.error || 'Error al registrar voto');
                }
                
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
            } else {
                // En desarrollo local: usar SQLite directo y actualizar estado local
                console.log('Enviando a SQLite directo - ID:', idCandidato);
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
            }
            
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
                // En Vercel: reiniciar SQLite vía servidor
                console.log('Reiniciando votos en SQLite vía servidor Vercel');
                const respuesta = await fetch('/api/reiniciar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                const datos = await respuesta.json();
                if (!datos.success) {
                    throw new Error(datos.error || 'Error al reiniciar votos en SQLite');
                }
                
                // Recargar datos desde SQLite vía servidor
                await this.cargarDatosIniciales();
                return;
            } else {
                // En desarrollo local: usar SQLite directo
                await this.servicioBaseDatos.reiniciarVotos();
                // Recargar datos desde SQLite
                await this.cargarDatosIniciales();
                return;
            }
            
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
