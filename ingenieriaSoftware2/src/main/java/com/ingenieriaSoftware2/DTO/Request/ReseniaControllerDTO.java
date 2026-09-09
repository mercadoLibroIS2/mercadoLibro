package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;

public record ReseniaControllerDTO(
        IntercambioId intercambioId,
        String calificadoEmail,
        float calificacion,
        String comentario
) {
}
