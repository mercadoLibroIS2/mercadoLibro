package com.ingenieriaSoftware2.DTO.Response;

import java.util.UUID;

public record ReseniaResponseDTO(
        UUID id,
        com.ingenieriaSoftware2.Entity.Ids.IntercambioId intercambioId,
        UUID autorId,
        UUID calificadoId,
        float calificacion,
        String comentario
) {
}
