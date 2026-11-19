package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Enums.ColorSemaforo;
import com.ingenieriaSoftware2.Enums.EstadoFisico;

public record PublicacionResponseDTO(
        PublicacionId publicacionId,
        String titulo,
        String autor,
        String portadaUrl,
        EstadoFisico estadoFisico,
        Integer valorPuntosSolicitado,
        Integer valorReferenciaCalculado,
        ColorSemaforo colorSemaforo,
        String comentario,
        String nombrePropietario,
        EstadoPublicacion estadoPublicacion,
        // 0 = el propietario todavía no tiene reseñas
        Float reputacionPropietario,
        // Puntuación de Google Books (0-5), null si no se conoce
        Double puntuacionExterna,
        String categoria,
        Integer paginas
) {
}
