package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Enums.EstadoFisico;

public record PublicacionResponseDTO(
        PublicacionId publicacionId,
        EstadoFisico estadoFisico,
        Integer valorPuntosSolicitado,
        Integer valorReferenciaCalculado,
        String comentario
) {
}
