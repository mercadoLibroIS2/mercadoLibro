package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;

import java.util.UUID;

public record ReseniaResponseDTO(
        UUID id,
        IntercambioId intercambioId,
        String autorId,
        String calificadoId, // calificado es usuario asumo
        float calificacion,
        String comentario
) {
}
