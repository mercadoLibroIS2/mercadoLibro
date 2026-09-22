package com.ingenieriaSoftware2.DTO.Response;

import java.util.UUID;

public record ReseniaResponseDTO(
        UUID id,
        UUID intercambioId,
        UUID autorId,
        UUID calificadoId,
        float calificacion,
        String comentario
) {
}
