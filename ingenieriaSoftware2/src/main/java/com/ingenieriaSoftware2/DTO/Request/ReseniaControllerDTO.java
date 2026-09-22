package com.ingenieriaSoftware2.DTO.Request;

import java.util.UUID;

public record ReseniaControllerDTO(
        UUID intercambioId,
        UUID calificado,
        float calificacion,
        String comentario
) {
}
