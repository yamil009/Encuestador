// Modelo de Candidato para las elecciones Bolivia 2025
class Candidato {
    constructor(idCandidato, nombre, partido, colorPrimario = '#3498db', colorSecundario = '#2980b9', urlFoto = null) {
        this.idCandidato = idCandidato;
        this.nombre = nombre;
        this.partido = partido;
        this.cantidadVotos = 0;
        this.colorPrimario = colorPrimario;
        this.colorSecundario = colorSecundario;
        this.urlFoto = urlFoto;
    }

    // Obtener porcentaje de votos
    obtenerPorcentaje(totalVotos) {
        if (totalVotos === 0) return 0;
        return ((this.cantidadVotos / totalVotos) * 100).toFixed(2);
    }

    // Incrementar votos
    incrementarVotos() {
        this.cantidadVotos++;
    }

    // Reiniciar votos
    reiniciarVotos() {
        this.cantidadVotos = 0;
    }

    // Convertir a objeto para la base de datos
    toDatabase() {
        return {
            id_candidato: this.idCandidato,
            nombre: this.nombre,
            partido: this.partido,
            cantidad_votos: this.cantidadVotos
        };
    }

    // Crear desde objeto de base de datos
    static fromDatabase(data) {
        const candidato = new Candidato(
            data.id_candidato,
            data.nombre,
            data.partido
        );
        candidato.cantidadVotos = data.cantidad_votos || 0;
        return candidato;
    }
}

// Lista de candidatos oficiales para Bolivia 2025
const candidatosOficiales = [
    new Candidato(1, 'Jorge Quiroga Ramírez', 'Alianza Libre', '#e74c3c', '#c0392b', 'https://www.infobae.com/resizer/v2/C2MZCB7IWBF5JK2453HTMNO6L4.jpg?auth=e83fd4519f5c04bd5cfe971368c3d801004c5692ce2906bdb64b5e3b465c703c&smart=true&width=1200&height=1200&quality=85'),
    new Candidato(2, 'Samuel Doria Medina', 'Alianza Unidad', '#3498db', '#2980b9', 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcSSjb-de2eOubcOFx32X9FYnv_eaNYbTYBwPAnQzEifGRi4vKzN'),
    new Candidato(3, 'Rodrigo Paz Pereira', 'Partido Demócrata Cristiano', '#f39c12', '#e67e22', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZFcoP-fxW_RqkxZiCZTLysHhKFbYtC7kxJkSjav0sggfnT0D-I0TzeP7mNl6dh5N21yI&usqp=CAU'),
    new Candidato(4, 'Manfred Reyes Villa', 'APB Súmate', '#9b59b6', '#8e44ad', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWMype6p_hzs5Nlz_cB55jreCvaNosupzr0YgTWeCxYFp03K5ZEKXb6jggjA_Dm4jDNzY&usqp=CAU'),
    new Candidato(5, 'Andrónico Rodríguez', 'Alianza Popular', '#27ae60', '#229954', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQX1E0JKe5qyUi46ePoMG33et4_dbbbXyYG3qTlgHzRxvJs9CXG886l3Eb4a-cFyvTEn4Q&usqp=CAU'),
    new Candidato(6, 'Jhonny Fernández', 'Unidad Cívica Solidaridad', '#e67e22', '#d35400'),
    new Candidato(7, 'Eduardo Del Castillo', 'Movimiento al Socialismo', '#2ecc71', '#27ae60', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUxW7bLIPYIzxaBeEf55JIOWKJrEqpHaqq8oxAlmY_qZ40gGeEdivMY7LOtA-j14m2YfA&usqp=CAU'),
    new Candidato(8, 'Pavel Aracena Vargas', 'Alianza Libertad y Progreso', '#34495e', '#2c3e50', 'https://estaticos.unitel.bo/binrepository/1201x722/0c0/1200d630/none/246276540/BVBX/noticias-unitel_101-12141688_20250606190019.jpg')
];

// Configurar votos iniciales: Total 120 votos
candidatosOficiales[0].cantidadVotos = 35; // Jorge Quiroga Ramírez - 1°
candidatosOficiales[1].cantidadVotos = 28; // Samuel Doria Medina - 2°
candidatosOficiales[2].cantidadVotos = 22; // Rodrigo Paz Pereira - 3°
candidatosOficiales[3].cantidadVotos = 15; // Manfred Reyes Villa - 4°
candidatosOficiales[4].cantidadVotos = 8;  // Andrónico Rodríguez - 5°
candidatosOficiales[5].cantidadVotos = 6;  // Jhonny Fernández - 6°
candidatosOficiales[6].cantidadVotos = 4;  // Eduardo Del Castillo - 7°
candidatosOficiales[7].cantidadVotos = 2;  // Pavel Aracena Vargas - 8°

// Exportar para uso en Node.js o navegador
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Candidato, candidatosOficiales };
} else {
    window.Candidato = Candidato;
    window.candidatosOficiales = candidatosOficiales;
}
