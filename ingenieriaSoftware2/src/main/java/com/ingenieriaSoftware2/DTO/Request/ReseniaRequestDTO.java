package com.ingenieriaSoftware2.DTO.Request;

import java.util.UUID;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;

public record ReseniaRequestDTO(
        IntercambioId intercambioId,
        UUID autorId,
        UUID calificado,
        float calificacion,
        String comentario
) {
}
