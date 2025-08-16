// Vista de resultados con gráficos y estadísticas
class VistaResultados {
    constructor(contenedor, proveedorEstado) {
        this.contenedor = contenedor;
        this.proveedor = proveedorEstado;
        this.cancelarSuscripcion = null;
        this.graficoBarras = null;
        this.graficoCircular = null;
        this.inicializar();
    }

    inicializar() {
        this.renderizar();
        this.configurarEventos();
        
        // Suscribirse a cambios de estado
        this.cancelarSuscripcion = this.proveedor.suscribirse((estado) => {
            this.actualizarVista(estado);
        });
    }

    renderizar() {
        const estado = this.proveedor.obtenerEstado();
        const resultados = this.proveedor.obtenerResultadosConPorcentajes();
        
        this.contenedor.innerHTML = `
            <div class="vista-resultados">
                <!-- Header -->
                <header class="header-resultados">
                    <div class="contenedor-header">
                        <h1 class="titulo-principal">
                            <i class="material-icons">bar_chart</i>
                            Resultados Electorales
                        </h1>
                        <p class="subtitulo">Análisis en tiempo real de las encuestas</p>
                        <div class="resumen-votos">
                            <div class="metrica">
                                <span class="numero">${estado.totalVotos}</span>
                                <span class="etiqueta">Total Votos</span>
                            </div>
                            <div class="metrica">
                                <span class="numero">${resultados.length}</span>
                                <span class="etiqueta">Candidatos</span>
                            </div>
                            <div class="metrica">
                                <span class="numero">${this.obtenerLider(resultados)}</span>
                                <span class="etiqueta">Líder Actual</span>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- Navegación -->
                <nav class="navegacion-principal">
                    <button class="btn-nav" data-vista="votacion">
                        <i class="material-icons">how_to_vote</i>
                        Votar
                    </button>
                    <button class="btn-nav activo" data-vista="resultados">
                        <i class="material-icons">bar_chart</i>
                        Resultados
                    </button>
                </nav>

                <!-- Controles de visualización -->
                <div class="controles-graficos">
                    <div class="selector-grafico">
                        <button class="btn-tipo-grafico activo" data-tipo="barras">
                            <i class="material-icons">bar_chart</i>
                            Barras
                        </button>
                        <button class="btn-tipo-grafico" data-tipo="circular">
                            <i class="material-icons">pie_chart</i>
                            Circular
                        </button>
                        <button class="btn-tipo-grafico" data-tipo="dona">
                            <i class="material-icons">donut_small</i>
                            Dona
                        </button>
                    </div>
                    <button class="btn-actualizar" ${estado.cargando ? 'disabled' : ''}>
                        <i class="material-icons">refresh</i>
                        Actualizar
                    </button>
                </div>

                <!-- Contenedor principal -->
                <main class="contenido-resultados">
                    <!-- Gráfico principal -->
                    <section class="seccion-grafico">
                        <div class="contenedor-grafico">
                            <canvas id="graficoResultados"></canvas>
                        </div>
                        <div class="indicador-carga-grafico ${estado.cargando ? 'visible' : ''}">
                            <div class="spinner"></div>
                            <p>Actualizando gráfico...</p>
                        </div>
                    </section>

                    <!-- Tabla de resultados -->
                    <section class="seccion-tabla">
                        <h2>
                            <i class="material-icons">table_chart</i>
                            Resultados Detallados
                        </h2>
                        <div class="tabla-resultados">
                            ${this.renderizarTablaResultados(resultados)}
                        </div>
                    </section>

                    <!-- Estadísticas adicionales -->
                    <section class="seccion-estadisticas">
                        <h2>
                            <i class="material-icons">analytics</i>
                            Análisis Estadístico
                        </h2>
                        <div class="grid-estadisticas">
                            ${this.renderizarEstadisticas(resultados, estado.totalVotos)}
                        </div>
                    </section>
                </main>

                <!-- Footer con acciones -->
                <footer class="footer-resultados">
                    <div class="acciones-footer">
                        <button class="btn-exportar">
                            <i class="material-icons">download</i>
                            Exportar Datos
                        </button>
                        <button class="btn-reiniciar-resultados" ${estado.cargando ? 'disabled' : ''}>
                            <i class="material-icons">refresh</i>
                            Reiniciar Votos
                        </button>
                    </div>
                    <p>&copy; 2025 Encuestas Bolivia - Resultados en Tiempo Real</p>
                </footer>
            </div>
        `;

        // Inicializar gráfico después de renderizar
        setTimeout(() => this.inicializarGrafico('barras'), 100);
    }

    renderizarTablaResultados(resultados) {
        if (!resultados || resultados.length === 0) {
            return `
                <div class="sin-resultados">
                    <i class="material-icons">info</i>
                    <p>No hay resultados disponibles</p>
                </div>
            `;
        }

        const filasTabla = resultados.map((candidato, index) => `
            <tr class="fila-candidato" style="--color-candidato: ${candidato.colorPrimario}">
                <td class="posicion">
                    <span class="numero-posicion">${index + 1}</span>
                    ${index === 0 ? '<i class="material-icons corona">emoji_events</i>' : ''}
                </td>
                <td class="candidato">
                    <div class="info-candidato-tabla">
                        <div class="avatar-tabla" style="background-color: ${candidato.colorPrimario}">
                            <i class="material-icons">person</i>
                        </div>
                        <div class="datos-candidato">
                            <strong class="nombre">${candidato.nombre}</strong>
                            <span class="partido">${candidato.partido}</span>
                        </div>
                    </div>
                </td>
                <td class="votos">
                    <span class="numero-votos">${candidato.cantidad_votos}</span>
                </td>
                <td class="porcentaje">
                    <div class="barra-porcentaje">
                        <div class="relleno-barra" 
                             style="width: ${candidato.porcentaje}%; background-color: ${candidato.colorPrimario}">
                        </div>
                        <span class="texto-porcentaje">${candidato.porcentaje}%</span>
                    </div>
                </td>
            </tr>
        `).join('');

        return `
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>Pos.</th>
                        <th>Candidato</th>
                        <th>Votos</th>
                        <th>Porcentaje</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasTabla}
                </tbody>
            </table>
        `;
    }

    renderizarEstadisticas(resultados, totalVotos) {
        const lider = resultados[0] || {};
        const segundo = resultados[1] || {};
        const diferencia = (lider.cantidad_votos || 0) - (segundo.cantidad_votos || 0);
        const participacion = totalVotos;
        const promedio = totalVotos > 0 ? (totalVotos / resultados.length).toFixed(1) : 0;

        return `
            <div class="tarjeta-estadistica">
                <div class="icono-estadistica">
                    <i class="material-icons">trending_up</i>
                </div>
                <div class="datos-estadistica">
                    <span class="valor">${lider.nombre || 'N/A'}</span>
                    <span class="etiqueta">Candidato Líder</span>
                </div>
            </div>
            
            <div class="tarjeta-estadistica">
                <div class="icono-estadistica">
                    <i class="material-icons">compare_arrows</i>
                </div>
                <div class="datos-estadistica">
                    <span class="valor">${diferencia}</span>
                    <span class="etiqueta">Diferencia con 2°</span>
                </div>
            </div>
            
            <div class="tarjeta-estadistica">
                <div class="icono-estadistica">
                    <i class="material-icons">people</i>
                </div>
                <div class="datos-estadistica">
                    <span class="valor">${participacion}</span>
                    <span class="etiqueta">Participación Total</span>
                </div>
            </div>
            
            <div class="tarjeta-estadistica">
                <div class="icono-estadistica">
                    <i class="material-icons">functions</i>
                </div>
                <div class="datos-estadistica">
                    <span class="valor">${promedio}</span>
                    <span class="etiqueta">Promedio por Candidato</span>
                </div>
            </div>
        `;
    }

    obtenerLider(resultados) {
        if (!resultados || resultados.length === 0) return 'N/A';
        return resultados[0].nombre.split(' ')[0]; // Solo primer nombre
    }

    configurarEventos() {
        this.contenedor.addEventListener('click', (e) => {
            const btnNav = e.target.closest('.btn-nav');
            if (btnNav) {
                const vista = btnNav.dataset.vista;
                this.proveedor.cambiarVista(vista);
                return;
            }

            const btnTipoGrafico = e.target.closest('.btn-tipo-grafico');
            if (btnTipoGrafico) {
                const tipo = btnTipoGrafico.dataset.tipo;
                this.cambiarTipoGrafico(tipo);
                return;
            }

            const btnActualizar = e.target.closest('.btn-actualizar');
            if (btnActualizar && !btnActualizar.disabled) {
                this.actualizarDatos();
                return;
            }

            const btnExportar = e.target.closest('.btn-exportar');
            if (btnExportar) {
                this.exportarDatos();
                return;
            }

            const btnReiniciar = e.target.closest('.btn-reiniciar-resultados');
            if (btnReiniciar && !btnReiniciar.disabled) {
                this.manejarReinicio();
                return;
            }
        });
    }

    inicializarGrafico(tipo = 'barras') {
        const canvas = this.contenedor.querySelector('#graficoResultados');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const resultados = this.proveedor.obtenerResultadosConPorcentajes();

        // Destruir gráfico anterior si existe
        if (this.graficoActual) {
            this.graficoActual.destroy();
        }

        const datos = {
            labels: resultados.map(r => r.nombre.split(' ')[0] + ' ' + r.nombre.split(' ')[1]),
            datasets: [{
                label: 'Votos',
                data: resultados.map(r => r.cantidad_votos),
                backgroundColor: resultados.map(r => r.colorPrimario),
                borderColor: resultados.map(r => r.colorSecundario),
                borderWidth: 2
            }]
        };

        const opciones = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Resultados Electorales Bolivia 2025',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: tipo !== 'barras',
                    position: 'bottom'
                }
            }
        };

        // Configuración específica por tipo
        if (tipo === 'barras') {
            opciones.scales = {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            };
        }

        this.graficoActual = new Chart(ctx, {
            type: tipo === 'barras' ? 'bar' : (tipo === 'dona' ? 'doughnut' : 'pie'),
            data: datos,
            options: opciones
        });
    }

    cambiarTipoGrafico(tipo) {
        // Actualizar botones activos
        this.contenedor.querySelectorAll('.btn-tipo-grafico').forEach(btn => {
            btn.classList.remove('activo');
        });
        this.contenedor.querySelector(`[data-tipo="${tipo}"]`).classList.add('activo');

        // Reinicializar gráfico
        this.inicializarGrafico(tipo);
    }

    async actualizarDatos() {
        await this.proveedor.cargarDatosIniciales();
    }

    async manejarReinicio() {
        if (confirm('¿Estás seguro de que deseas reiniciar todos los votos? Esta acción no se puede deshacer.')) {
            await this.proveedor.reiniciarVotos();
        }
    }

    exportarDatos() {
        const resultados = this.proveedor.obtenerResultadosConPorcentajes();
        const datos = {
            fecha: new Date().toISOString(),
            totalVotos: this.proveedor.obtenerEstado().totalVotos,
            resultados: resultados
        };

        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resultados-encuesta-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    actualizarVista(estado) {
        // Actualizar métricas del header
        const totalVotos = this.contenedor.querySelector('.resumen-votos .numero');
        if (totalVotos) {
            totalVotos.textContent = estado.totalVotos;
        }

        // Actualizar gráfico si existe
        if (this.graficoActual) {
            const resultados = this.proveedor.obtenerResultadosConPorcentajes();
            this.graficoActual.data.datasets[0].data = resultados.map(r => r.cantidad_votos);
            this.graficoActual.update();
        }

        // Actualizar tabla
        const seccionTabla = this.contenedor.querySelector('.tabla-resultados');
        if (seccionTabla) {
            const resultados = this.proveedor.obtenerResultadosConPorcentajes();
            seccionTabla.innerHTML = this.renderizarTablaResultados(resultados);
        }
    }

    destruir() {
        if (this.graficoActual) {
            this.graficoActual.destroy();
        }
        if (this.cancelarSuscripcion) {
            this.cancelarSuscripcion();
        }
        this.contenedor.innerHTML = '';
    }
}

// Exportar para uso en Node.js o navegador
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VistaResultados;
} else {
    window.VistaResultados = VistaResultados;
}
