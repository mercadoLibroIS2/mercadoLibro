package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Enums.EstadoCompra;

import java.util.UUID;

public record CompraResponseDTO(
        CompraId id,
        UUID compradorId,
        UUID propietarioId,
        String libroId,
        String isbn,
        Integer puntos,
        EstadoCompra estado
) {
}
