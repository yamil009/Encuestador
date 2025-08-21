class DashboardElectoral {
    constructor() {
        this.resultadosChart = null;
        this.recintoChart = null;
        this.ubicaciones = {};
        this.init();
    }

    async init() {
        await this.cargarInformacionGeneral();
        await this.cargarResultadosNacionales();
        await this.cargarUbicaciones();
        this.configurarEventos();
    }

    async cargarInformacionGeneral() {
        try {
            const response = await fetch('/api/dashboard/general');
            const data = await response.json();
            
            if (data.success) {
                const info = data.data;
                document.getElementById('total-mesas').textContent = info.totalMesas.toLocaleString();
                document.getElementById('total-inscritos').textContent = info.totalInscritos.toLocaleString();
                document.getElementById('total-votos').textContent = info.totalVotosEmitidos.toLocaleString();
                document.getElementById('participacion').textContent = info.participacion + '%';
                document.getElementById('total-departamentos').textContent = info.totalDepartamentos;
                
                document.getElementById('loading-general').style.display = 'none';
            }
        } catch (error) {
            console.error('Error cargando información general:', error);
            document.getElementById('loading-general').textContent = 'Error al cargar información general';
        }
    }

    async cargarResultadosNacionales() {
        try {
            const response = await fetch('/api/dashboard/resultados-nacionales');
            const data = await response.json();
            
            if (data.success) {
                this.resultadosData = data.data;
                this.mostrarResultados();
                this.crearGraficoResultados('bar');
                
                document.getElementById('loading-resultados').style.display = 'none';
            }
        } catch (error) {
            console.error('Error cargando resultados nacionales:', error);
            document.getElementById('loading-resultados').textContent = 'Error al cargar resultados nacionales';
        }
    }

    mostrarResultados() {
        const tbody = document.querySelector('#resultados-table tbody');
        tbody.innerHTML = '';
        
        this.resultadosData.resultados.forEach((resultado, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${resultado.nombre}</strong></td>
                <td>${resultado.votos.toLocaleString()}</td>
                <td>${resultado.porcentaje}%</td>
            `;
            tbody.appendChild(row);
        });
    }

    crearGraficoResultados(tipo) {
        const ctx = document.getElementById('resultados-chart').getContext('2d');
        
        if (this.resultadosChart) {
            this.resultadosChart.destroy();
        }

        const colores = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
            '#36A2EB', '#FFCE56'
        ];

        const labels = this.resultadosData.resultados.map(r => r.nombre);
        const datos = this.resultadosData.resultados.map(r => r.votos);

        const config = {
            type: tipo,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Votos',
                    data: datos,
                    backgroundColor: colores.slice(0, datos.length),
                    borderColor: colores.slice(0, datos.length),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: tipo === 'bar' ? 'top' : 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const porcentaje = ((context.raw / total) * 100).toFixed(2);
                                return `${context.label}: ${context.raw.toLocaleString()} votos (${porcentaje}%)`;
                            }
                        }
                    }
                },
                scales: tipo === 'bar' ? {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    }
                } : {}
            }
        };

        this.resultadosChart = new Chart(ctx, config);
    }

    async cargarUbicaciones() {
        try {
            const response = await fetch('/api/dashboard/ubicaciones');
            const data = await response.json();
            
            if (data.success) {
                this.ubicaciones = data.data;
                this.poblarSelectDepartamentos();
            }
        } catch (error) {
            console.error('Error cargando ubicaciones:', error);
        }
    }

    poblarSelectDepartamentos() {
        const select = document.getElementById('departamento-select');
        select.innerHTML = '<option value="">Seleccionar departamento...</option>';
        
        Object.keys(this.ubicaciones).sort().forEach(departamento => {
            const option = document.createElement('option');
            option.value = departamento;
            option.textContent = departamento;
            select.appendChild(option);
        });
    }

    poblarSelectMunicipios(departamento) {
        const select = document.getElementById('municipio-select');
        select.innerHTML = '<option value="">Seleccionar municipio...</option>';
        select.disabled = false;
        
        if (this.ubicaciones[departamento]) {
            Object.keys(this.ubicaciones[departamento]).sort().forEach(municipio => {
                const option = document.createElement('option');
                option.value = municipio;
                option.textContent = municipio;
                select.appendChild(option);
            });
        }
    }

    poblarSelectRecintos(departamento, municipio) {
        const select = document.getElementById('recinto-select');
        select.innerHTML = '<option value="">Seleccionar recinto...</option>';
        select.disabled = false;
        
        if (this.ubicaciones[departamento] && this.ubicaciones[departamento][municipio]) {
            this.ubicaciones[departamento][municipio].sort().forEach(recinto => {
                const option = document.createElement('option');
                option.value = recinto;
                option.textContent = recinto;
                select.appendChild(option);
            });
        }
    }

    async cargarDatosRecinto(departamento, municipio, recinto) {
        try {
            document.getElementById('loading-recinto').style.display = 'block';
            document.getElementById('recinto-info').style.display = 'none';
            
            const response = await fetch(`/api/dashboard/recinto/${encodeURIComponent(departamento)}/${encodeURIComponent(municipio)}/${encodeURIComponent(recinto)}`);
            const data = await response.json();
            
            if (data.success) {
                this.mostrarDatosRecinto(data.data);
                this.crearGraficoRecinto(data.data.resultados);
            } else {
                alert('No se encontraron datos para el recinto seleccionado');
            }
        } catch (error) {
            console.error('Error cargando datos del recinto:', error);
            alert('Error al cargar datos del recinto');
        } finally {
            document.getElementById('loading-recinto').style.display = 'none';
        }
    }

    mostrarDatosRecinto(data) {
        const recinto = data.recinto;
        
        document.getElementById('recinto-nombre').textContent = recinto.recinto;
        document.getElementById('recinto-ubicacion').textContent = `${recinto.departamento} - ${recinto.municipio}`;
        document.getElementById('recinto-mesas').textContent = recinto.totalMesas;
        document.getElementById('recinto-inscritos').textContent = recinto.totalInscritos.toLocaleString();
        document.getElementById('recinto-votos').textContent = recinto.totalVotosEmitidos.toLocaleString();
        document.getElementById('recinto-participacion').textContent = recinto.participacion + '%';
        
        document.getElementById('recinto-info').style.display = 'block';
    }

    crearGraficoRecinto(resultados) {
        const ctx = document.getElementById('recinto-chart').getContext('2d');
        
        if (this.recintoChart) {
            this.recintoChart.destroy();
        }

        const colores = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
            '#36A2EB', '#FFCE56'
        ];

        const labels = resultados.map(r => r.nombre);
        const datos = resultados.map(r => r.votos);

        this.recintoChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: datos,
                    backgroundColor: colores.slice(0, datos.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const porcentaje = ((context.raw / total) * 100).toFixed(2);
                                return `${context.label}: ${context.raw.toLocaleString()} votos (${porcentaje}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    configurarEventos() {
        // Botones de tipo de gráfico
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.crearGraficoResultados(e.target.dataset.chart);
            });
        });

        // Selectores de ubicación
        document.getElementById('departamento-select').addEventListener('change', (e) => {
            const departamento = e.target.value;
            document.getElementById('municipio-select').disabled = !departamento;
            document.getElementById('recinto-select').disabled = true;
            document.getElementById('recinto-info').style.display = 'none';
            
            if (departamento) {
                this.poblarSelectMunicipios(departamento);
            }
        });

        document.getElementById('municipio-select').addEventListener('change', (e) => {
            const municipio = e.target.value;
            const departamento = document.getElementById('departamento-select').value;
            document.getElementById('recinto-select').disabled = !municipio;
            document.getElementById('recinto-info').style.display = 'none';
            
            if (municipio && departamento) {
                this.poblarSelectRecintos(departamento, municipio);
            }
        });

        document.getElementById('recinto-select').addEventListener('change', (e) => {
            const recinto = e.target.value;
            const departamento = document.getElementById('departamento-select').value;
            const municipio = document.getElementById('municipio-select').value;
            
            if (recinto && departamento && municipio) {
                this.cargarDatosRecinto(departamento, municipio, recinto);
            }
        });
    }
}

// Inicializar dashboard cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new DashboardElectoral();
});
