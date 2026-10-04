package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Enums.EstadoCompra;


public record CompraResponseDTO(
        CompraId id,
        String compradorId,
        String propietarioId,
        String libroId,
        String isbn,
        Long puntos,
        EstadoCompra estado
) {
}
