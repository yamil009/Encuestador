// Aplicación principal Encuestas Bolivia 2025
class AplicacionEncuestas {
    constructor() {
        this.contenedorApp = document.getElementById('aplicacion');
        this.proveedorEstado = null;
        this.vistaActual = null;
        this.inicializar();
    }

    async inicializar() {
        try {
            // Mostrar indicador de carga
            this.mostrarCargaInicial();
            
            // Esperar a que las clases estén disponibles
            await this.esperarClases();
            
            // Configurar proveedor de estado con adaptador para navegador
            const adaptadorBaseDatos = new AdaptadorBaseDatos();
            this.proveedorEstado = new ProveedorEstado();
            this.proveedorEstado.inicializar(adaptadorBaseDatos);
            
            // Suscribirse a cambios de vista
            this.proveedorEstado.suscribirse((estado) => {
                if (estado.vistaActual !== this.vistaActualTipo) {
                    this.cambiarVista(estado.vistaActual);
                }
            });
            
            // Cargar datos iniciales
            await this.proveedorEstado.cargarDatosIniciales();
            
            // Mostrar vista inicial
            this.cambiarVista('votacion');
            
        } catch (error) {
            console.error('Error al inicializar aplicación:', error);
            this.mostrarError('Error al inicializar la aplicación');
        }
    }

    async esperarClases() {
        return new Promise((resolve) => {
            const verificar = () => {
                if (window.ProveedorEstado && window.VistaVotacion && window.VistaResultados && window.candidatosOficiales) {
                    resolve();
                } else {
                    setTimeout(verificar, 50);
                }
            };
            verificar();
        });
    }

    mostrarCargaInicial() {
        this.contenedorApp.innerHTML = `
            <div class="cargando-inicial">
                <div class="spinner-grande"></div>
                <h2>Cargando Encuestas Bolivia 2025</h2>
                <p>Inicializando sistema electoral...</p>
            </div>
        `;
    }

    cambiarVista(tipoVista) {
        // Destruir vista anterior
        if (this.vistaActual && this.vistaActual.destruir) {
            this.vistaActual.destruir();
        }

        // Crear nueva vista
        switch (tipoVista) {
            case 'votacion':
                this.vistaActual = new VistaVotacion(this.contenedorApp, this.proveedorEstado);
                this.vistaActualTipo = 'votacion';
                break;
            case 'resultados':
                this.vistaActual = new VistaResultados(this.contenedorApp, this.proveedorEstado);
                this.vistaActualTipo = 'resultados';
                break;
            default:
                console.error('Vista no reconocida:', tipoVista);
                this.cambiarVista('votacion');
        }
    }

    mostrarError(mensaje) {
        this.contenedorApp.innerHTML = `
            <div class="error-aplicacion">
                <div class="icono-error">
                    <i class="material-icons">error_outline</i>
                </div>
                <h2>Error en la Aplicación</h2>
                <p>${mensaje}</p>
                <button onclick="location.reload()" class="btn-reintentar">
                    <i class="material-icons">refresh</i>
                    Reintentar
                </button>
            </div>
        `;
    }
}

// Adaptador para comunicarse con el backend desde el navegador
class AdaptadorBaseDatos {
    constructor() {
        this.baseUrl = '';
    }

    async obtenerResultados() {
        try {
            const respuesta = await fetch('/api/candidatos');
            const datos = await respuesta.json();
            
            if (!datos.success) {
                throw new Error(datos.error || 'Error al obtener candidatos');
            }
            
            return datos.data;
        } catch (error) {
            console.error('Error en obtenerResultados:', error);
            throw error;
        }
    }

    async obtenerTotalVotos() {
        try {
            const respuesta = await fetch('/api/resultados');
            const datos = await respuesta.json();
            
            if (!datos.success) {
                throw new Error(datos.error || 'Error al obtener total de votos');
            }
            
            return datos.data.totalVotos;
        } catch (error) {
            console.error('Error en obtenerTotalVotos:', error);
            throw error;
        }
    }

    async registrarVoto(idCandidato) {
        try {
            const respuesta = await fetch('/api/votar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idCandidato })
            });
            
            const datos = await respuesta.json();
            
            if (!datos.success) {
                throw new Error(datos.error || 'Error al registrar voto');
            }
            
            return 1; // Simular filas afectadas
        } catch (error) {
            console.error('Error en registrarVoto:', error);
            throw error;
        }
    }

    async reiniciarVotos() {
        try {
            const respuesta = await fetch('/api/reiniciar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const datos = await respuesta.json();
            
            if (!datos.success) {
                throw new Error(datos.error || 'Error al reiniciar votos');
            }
            
            return datos.filasAfectadas;
        } catch (error) {
            console.error('Error en reiniciarVotos:', error);
            throw error;
        }
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.aplicacion = new AplicacionEncuestas();
});

// Manejo de errores globales
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesa rechazada:', event.reason);
});
