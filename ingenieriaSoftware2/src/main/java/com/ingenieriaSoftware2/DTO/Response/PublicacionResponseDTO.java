package com.ingenieriaSoftware2.DTO.Response;

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
        String comentario
) {
}
