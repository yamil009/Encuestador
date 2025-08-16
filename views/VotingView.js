// Vista principal de votación con Material Design
class VistaVotacion {
    constructor(contenedor, proveedorEstado) {
        this.contenedor = contenedor;
        this.proveedor = proveedorEstado;
        this.cancelarSuscripcion = null;
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
        
        this.contenedor.innerHTML = `
            <div class="vista-votacion">
                <!-- Header -->
                <header class="header-votacion">
                    <div class="contenedor-header">
                        <h1 class="titulo-principal">
                            <i class="material-icons">how_to_vote</i>
                            Encuestas Bolivia 2025
                        </h1>
                        <p class="subtitulo">Selecciona tu candidato preferido</p>
                        <div class="contador-votos">
                            <span class="total-votos">${estado.totalVotos}</span>
                            <span class="etiqueta-votos">votos registrados</span>
                        </div>
                    </div>
                </header>

                <!-- Botones de navegación -->
                <nav class="navegacion-principal">
                    <button class="btn-nav activo" data-vista="votacion">
                        <i class="material-icons">how_to_vote</i>
                        Votar
                    </button>
                    <button class="btn-nav" data-vista="resultados">
                        <i class="material-icons">bar_chart</i>
                        Resultados
                    </button>
                </nav>

                <!-- Indicador de carga -->
                <div class="indicador-carga ${estado.cargando ? 'visible' : ''}">
                    <div class="spinner"></div>
                    <p>Procesando voto...</p>
                </div>

                <!-- Mensaje de error -->
                ${estado.error ? `
                    <div class="mensaje-error">
                        <i class="material-icons">error</i>
                        <span>${estado.error}</span>
                        <button class="btn-cerrar-error">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                ` : ''}

                <!-- Grid de candidatos -->
                <main class="grid-candidatos">
                    ${this.renderizarCandidatos(estado.candidatos)}
                </main>

                <!-- Footer -->
                <footer class="footer-votacion">
                    <p>&copy; 2025 Encuestas Bolivia - Proyecto Académico</p>
                    <button class="btn-reiniciar" ${estado.cargando ? 'disabled' : ''}>
                        <i class="material-icons">refresh</i>
                        Reiniciar Votos
                    </button>
                </footer>
            </div>
        `;
    }

    renderizarCandidatos(candidatos) {
        if (!candidatos || candidatos.length === 0) {
            return `
                <div class="sin-candidatos">
                    <i class="material-icons">info</i>
                    <p>Cargando candidatos...</p>
                </div>
            `;
        }

        return candidatos.map(candidato => {
            console.log('Renderizando candidato:', candidato.nombre, 'ID:', candidato.id_candidato);
            return `
            <div class="tarjeta-candidato" 
                 style="--color-primario: ${candidato.colorPrimario}; --color-secundario: ${candidato.colorSecundario}">
                <div class="contenido-candidato">
                    <div class="avatar-candidato">
                        ${candidato.urlFoto ? 
                            `<img src="${candidato.urlFoto}" alt="${candidato.nombre}" class="foto-candidato-avatar">` : 
                            `<i class="material-icons">person</i>`
                        }
                    </div>
                    <div class="info-candidato">
                        <h3 class="nombre-candidato">${candidato.nombre}</h3>
                        <p class="partido-candidato">${candidato.partido}</p>
                        <div class="estadisticas-candidato">
                            <span class="votos-actuales">${candidato.cantidad_votos} votos</span>
                        </div>
                    </div>
                </div>
                <button class="btn-votar" 
                        data-candidato="${candidato.id_candidato}"
                        ${this.proveedor.obtenerEstado().cargando ? 'disabled' : ''}>
                    <i class="material-icons">how_to_vote</i>
                    <span>Votar</span>
                </button>
            </div>
        `;
        }).join('');
    }

    configurarEventos() {
        // Event delegation para botones de votar
        this.contenedor.addEventListener('click', (e) => {
            const btnVotar = e.target.closest('.btn-votar');
            if (btnVotar && !btnVotar.disabled) {
                const dataCandidato = btnVotar.dataset.candidato;
                console.log('dataset.candidato raw:', dataCandidato);
                const idCandidato = parseInt(dataCandidato);
                console.log('ID parseado:', idCandidato);
                this.manejarVoto(idCandidato);
                return;
            }

            const btnNav = e.target.closest('.btn-nav');
            if (btnNav) {
                const vista = btnNav.dataset.vista;
                this.proveedor.cambiarVista(vista);
                return;
            }

            const btnReiniciar = e.target.closest('.btn-reiniciar');
            if (btnReiniciar && !btnReiniciar.disabled) {
                this.manejarReinicio();
                return;
            }

            const btnCerrarError = e.target.closest('.btn-cerrar-error');
            if (btnCerrarError) {
                this.cerrarError();
                return;
            }
        });

        // Animaciones hover para tarjetas
        this.contenedor.addEventListener('mouseenter', (e) => {
            const tarjeta = e.target.closest('.tarjeta-candidato');
            if (tarjeta) {
                tarjeta.classList.add('hover');
            }
        }, true);

        this.contenedor.addEventListener('mouseleave', (e) => {
            const tarjeta = e.target.closest('.tarjeta-candidato');
            if (tarjeta) {
                tarjeta.classList.remove('hover');
            }
        }, true);
    }

    async manejarVoto(idCandidato) {
        try {
            console.log('Votando por candidato ID:', idCandidato, 'tipo:', typeof idCandidato);
            
            // Validar que el ID sea válido
            if (!idCandidato || isNaN(idCandidato)) {
                throw new Error('ID de candidato inválido');
            }
            
            // Mostrar animación de voto
            this.mostrarAnimacionVoto(idCandidato);
            
            // Registrar voto
            await this.proveedor.registrarVoto(idCandidato);
            
            // Mostrar notificación de éxito
            this.mostrarNotificación('¡Voto registrado exitosamente!', 'success');
            
        } catch (error) {
            console.error('Error al votar:', error);
            this.mostrarNotificacion('Error al registrar el voto', 'error');
        }
    }

    async manejarReinicio() {
        if (confirm('¿Estás seguro de que deseas reiniciar todos los votos? Esta acción no se puede deshacer.')) {
            try {
                await this.proveedor.reiniciarVotos();
                this.mostrarNotificacion('Votos reiniciados correctamente', 'success');
            } catch (error) {
                console.error('Error al reiniciar votos:', error);
                this.mostrarNotificacion('Error al reiniciar los votos', 'error');
            }
        }
    }

    mostrarAnimacionVoto(idCandidato) {
        const boton = this.contenedor.querySelector(`[data-candidato="${idCandidato}"]`);
        if (boton) {
            const tarjeta = boton.closest('.tarjeta-candidato');
            if (tarjeta) {
                tarjeta.classList.add('votando');
                setTimeout(() => {
                    tarjeta.classList.remove('votando');
                }, 1000);
            }
        }
    }

    mostrarNotificacion(mensaje, tipo = 'info') {
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion ${tipo}`;
        notificacion.innerHTML = `
            <i class="material-icons">${tipo === 'success' ? 'check_circle' : 'error'}</i>
            <span>${mensaje}</span>
        `;
        
        document.body.appendChild(notificacion);
        
        setTimeout(() => {
            notificacion.classList.add('visible');
        }, 100);
        
        setTimeout(() => {
            notificacion.classList.remove('visible');
            setTimeout(() => {
                document.body.removeChild(notificacion);
            }, 300);
        }, 3000);
    }

    cerrarError() {
        this.proveedor.actualizarEstado({ error: null });
    }

    actualizarVista(estado) {
        // Actualizar contador de votos
        const contadorVotos = this.contenedor.querySelector('.total-votos');
        if (contadorVotos) {
            contadorVotos.textContent = estado.totalVotos;
        }

        // Actualizar indicador de carga
        const indicadorCarga = this.contenedor.querySelector('.indicador-carga');
        if (indicadorCarga) {
            indicadorCarga.classList.toggle('visible', estado.cargando);
        }

        // Actualizar botones según estado de carga
        const botones = this.contenedor.querySelectorAll('.btn-votar, .btn-reiniciar');
        botones.forEach(btn => {
            btn.disabled = estado.cargando;
        });

        // Actualizar grid de candidatos si es necesario
        const gridActual = this.contenedor.querySelector('.grid-candidatos');
        if (gridActual && estado.candidatos) {
            gridActual.innerHTML = this.renderizarCandidatos(estado.candidatos);
        }
    }

    destruir() {
        if (this.cancelarSuscripcion) {
            this.cancelarSuscripcion();
        }
        this.contenedor.innerHTML = '';
    }
}

// Exportar para uso en Node.js o navegador
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VistaVotacion;
} else {
    window.VistaVotacion = VistaVotacion;
}
