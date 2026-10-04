package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Enums.EstadoCompra;

import java.time.Instant;
import java.util.UUID;

public record CompraResponseDTO(
        CompraId id,
        UUID compradorId,
        UUID propietarioId,
        UUID libroId,
        String isbn,
        Integer puntos,
        Instant timestamp,
        EstadoCompra estado
) {
}
