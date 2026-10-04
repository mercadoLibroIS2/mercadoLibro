package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Enums.EstadoFisico;

public record PublicacionResponseDTO(
        PublicacionId publicacionId,
        EstadoFisico estadoFisico,
        Long valorPuntosSolicitado,
        Long valorReferenciaCalculado,
        String comentario
) {
}
