// Variables globales
let encuestas = JSON.parse(localStorage.getItem('encuestas')) || [];

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('encuestaForm');
    form.addEventListener('submit', enviarEncuesta);
    
    // Cargar datos existentes si los hay
    if (encuestas.length > 0) {
        actualizarContadorEncuestas();
    }
});

// Función para enviar la encuesta
function enviarEncuesta(event) {
    event.preventDefault();
    
    // Obtener datos del formulario
    const formData = new FormData(event.target);
    const encuesta = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        recinto: formData.get('recinto'),
        edad: formData.get('edad'),
        genero: formData.get('genero'),
        educacion: formData.get('educacion'),
        voto: formData.get('voto'),
        certeza: formData.get('certeza'),
        comentarios: formData.get('comentarios') || ''
    };
    
    // Validar que todos los campos requeridos estén completos
    if (!encuesta.recinto || !encuesta.edad || !encuesta.genero || 
        !encuesta.educacion || !encuesta.voto || !encuesta.certeza) {
        alert('Por favor, complete todos los campos requeridos.');
        return;
    }
    
    // Guardar encuesta
    encuestas.push(encuesta);
    localStorage.setItem('encuestas', JSON.stringify(encuestas));
    
    // Mostrar mensaje de éxito
    mostrarMensajeExito();
    
    // Limpiar formulario
    event.target.reset();
    
    // Actualizar contador
    actualizarContadorEncuestas();
}

// Función para mostrar mensaje de éxito
function mostrarMensajeExito() {
    // Crear elemento de mensaje
    const mensaje = document.createElement('div');
    mensaje.className = 'mensaje-exito';
    mensaje.innerHTML = '¡Gracias por participar! Su encuesta ha sido registrada exitosamente.';
    
    // Insertar mensaje antes del formulario
    const form = document.getElementById('encuestaForm');
    form.parentNode.insertBefore(mensaje, form);
    
    // Remover mensaje después de 5 segundos
    setTimeout(() => {
        mensaje.remove();
    }, 5000);
    
    // Scroll hacia arriba para mostrar el mensaje
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Función para mostrar resultados
function mostrarResultados() {
    if (encuestas.length === 0) {
        alert('No hay encuestas registradas aún.');
        return;
    }
    
    const resultadosDiv = document.getElementById('resultados');
    const estadisticasDiv = document.getElementById('estadisticas');
    
    // Calcular estadísticas
    const estadisticas = calcularEstadisticas();
    
    // Generar HTML de estadísticas
    estadisticasDiv.innerHTML = generarHTMLEstadisticas(estadisticas);
    
    // Mostrar resultados
    resultadosDiv.classList.remove('oculto');
    
    // Scroll hacia los resultados
    resultadosDiv.scrollIntoView({ behavior: 'smooth' });
}

// Función para ocultar resultados
function ocultarResultados() {
    const resultadosDiv = document.getElementById('resultados');
    resultadosDiv.classList.add('oculto');
}

// Función para calcular estadísticas
function calcularEstadisticas() {
    const total = encuestas.length;
    const stats = {
        total: total,
        votos: {},
        demograficos: {
            edad: {},
            genero: {},
            educacion: {},
            recinto: {}
        },
        certeza: {
            promedio: 0,
            distribucion: {}
        }
    };
    
    // Inicializar contadores de votos - Candidatos oficiales 2025
    const candidatos = {
        'candidato1': 'Samuel Doria Medina (UN)',
        'candidato2': 'Jorge "Tuto" Quiroga (Libre-Libertad)',
        'candidato3': 'Andrónico Rodríguez (MTS)',
        'candidato4': 'Manfred Reyes Villa (APB Súmate)',
        'candidato5': 'Chi Hyun Chung (AMAR)',
        'candidato6': 'Rodrigo Paz Pereira (PDC)',
        'candidato7': 'Eduardo Del Castillo (MAS-IPSP)',
        'candidato8': 'Pavel Aracena Vargas (ADN)',
        'voto_blanco': 'Voto en Blanco',
        'indeciso': 'Indeciso/a'
    };
    
    Object.keys(candidatos).forEach(key => {
        stats.votos[key] = { count: 0, porcentaje: 0, nombre: candidatos[key] };
    });
    
    // Procesar cada encuesta
    let sumaCerteza = 0;
    encuestas.forEach(encuesta => {
        // Contar votos
        if (stats.votos[encuesta.voto]) {
            stats.votos[encuesta.voto].count++;
        }
        
        // Demografía
        stats.demograficos.edad[encuesta.edad] = (stats.demograficos.edad[encuesta.edad] || 0) + 1;
        stats.demograficos.genero[encuesta.genero] = (stats.demograficos.genero[encuesta.genero] || 0) + 1;
        stats.demograficos.educacion[encuesta.educacion] = (stats.demograficos.educacion[encuesta.educacion] || 0) + 1;
        stats.demograficos.recinto[encuesta.recinto] = (stats.demograficos.recinto[encuesta.recinto] || 0) + 1;
        
        // Certeza
        const certeza = parseInt(encuesta.certeza);
        sumaCerteza += certeza;
        stats.certeza.distribucion[certeza] = (stats.certeza.distribucion[certeza] || 0) + 1;
    });
    
    // Calcular porcentajes de votos
    Object.keys(stats.votos).forEach(key => {
        stats.votos[key].porcentaje = ((stats.votos[key].count / total) * 100).toFixed(1);
    });
    
    // Promedio de certeza
    stats.certeza.promedio = (sumaCerteza / total).toFixed(1);
    
    return stats;
}

// Función para generar HTML de estadísticas
function generarHTMLEstadisticas(stats) {
    let html = `
        <div class="estadistica-item">
            <span class="estadistica-candidato">Total de Encuestas:</span>
            <span class="estadistica-porcentaje">${stats.total}</span>
        </div>
        
        <h3 style="margin: 20px 0 10px 0; color: #2c3e50;">Intención de Voto:</h3>
    `;
    
    // Ordenar candidatos por porcentaje
    const votosOrdenados = Object.entries(stats.votos)
        .sort((a, b) => b[1].count - a[1].count);
    
    votosOrdenados.forEach(([key, data]) => {
        html += `
            <div class="estadistica-item">
                <div>
                    <div class="estadistica-candidato">${data.nombre}</div>
                    <div class="barra-progreso">
                        <div class="barra-relleno" style="width: ${data.porcentaje}%"></div>
                    </div>
                </div>
                <span class="estadistica-porcentaje">${data.porcentaje}%</span>
            </div>
        `;
    });
    
    html += `
        <h3 style="margin: 20px 0 10px 0; color: #2c3e50;">Nivel de Certeza Promedio:</h3>
        <div class="estadistica-item">
            <span class="estadistica-candidato">Certeza Promedio (1-5):</span>
            <span class="estadistica-porcentaje">${stats.certeza.promedio}</span>
        </div>
        
        <h3 style="margin: 20px 0 10px 0; color: #2c3e50;">Datos Demográficos:</h3>
    `;
    
    // Mostrar distribución por edad
    html += '<h4 style="margin: 10px 0 5px 0;">Por Edad:</h4>';
    Object.entries(stats.demograficos.edad).forEach(([edad, count]) => {
        const porcentaje = ((count / stats.total) * 100).toFixed(1);
        html += `
            <div class="estadistica-item">
                <span class="estadistica-candidato">${edad} años</span>
                <span class="estadistica-porcentaje">${porcentaje}%</span>
            </div>
        `;
    });
    
    // Mostrar distribución por género
    html += '<h4 style="margin: 10px 0 5px 0;">Por Género:</h4>';
    Object.entries(stats.demograficos.genero).forEach(([genero, count]) => {
        const porcentaje = ((count / stats.total) * 100).toFixed(1);
        html += `
            <div class="estadistica-item">
                <span class="estadistica-candidato">${genero.charAt(0).toUpperCase() + genero.slice(1)}</span>
                <span class="estadistica-porcentaje">${porcentaje}%</span>
            </div>
        `;
    });
    
    return html;
}

// Función para actualizar contador de encuestas
function actualizarContadorEncuestas() {
    // Crear o actualizar contador en el header
    let contador = document.getElementById('contador-encuestas');
    if (!contador) {
        contador = document.createElement('p');
        contador.id = 'contador-encuestas';
        contador.style.cssText = 'color: #27ae60; font-weight: bold; margin-top: 10px;';
        document.querySelector('header').appendChild(contador);
    }
    
    contador.textContent = `Encuestas registradas: ${encuestas.length}`;
}

// Función para exportar datos (bonus)
function exportarDatos() {
    if (encuestas.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }
    
    const dataStr = JSON.stringify(encuestas, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `encuesta_electoral_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// Función para limpiar todos los datos (para desarrollo/testing)
function limpiarDatos() {
    if (confirm('¿Está seguro de que desea eliminar todas las encuestas? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('encuestas');
        encuestas = [];
        actualizarContadorEncuestas();
        ocultarResultados();
        alert('Todos los datos han sido eliminados.');
    }
}

// Análisis básico de comentarios (simulación de IA)
function analizarComentarios() {
    const comentarios = encuestas
        .filter(e => e.comentarios && e.comentarios.trim() !== '')
        .map(e => e.comentarios);
    
    if (comentarios.length === 0) {
        return 'No hay comentarios para analizar.';
    }
    
    // Palabras clave positivas y negativas (análisis básico)
    const palabrasPositivas = ['bueno', 'excelente', 'mejor', 'confianza', 'esperanza', 'cambio', 'progreso'];
    const palabrasNegativas = ['malo', 'peor', 'corrupción', 'problema', 'crisis', 'desconfianza'];
    
    let sentimientoPositivo = 0;
    let sentimientoNegativo = 0;
    
    comentarios.forEach(comentario => {
        const comentarioLower = comentario.toLowerCase();
        palabrasPositivas.forEach(palabra => {
            if (comentarioLower.includes(palabra)) sentimientoPositivo++;
        });
        palabrasNegativas.forEach(palabra => {
            if (comentarioLower.includes(palabra)) sentimientoNegativo++;
        });
    });
    
    const totalSentimientos = sentimientoPositivo + sentimientoNegativo;
    if (totalSentimientos === 0) {
        return 'Sentimiento neutral en los comentarios.';
    }
    
    const porcentajePositivo = ((sentimientoPositivo / totalSentimientos) * 100).toFixed(1);
    return `Análisis de sentimientos: ${porcentajePositivo}% positivo, ${(100 - porcentajePositivo).toFixed(1)}% negativo`;
}

// Agregar funciones de utilidad al objeto window para acceso desde consola
window.encuestaUtils = {
    exportarDatos,
    limpiarDatos,
    analizarComentarios,
    verDatos: () => encuestas
};
