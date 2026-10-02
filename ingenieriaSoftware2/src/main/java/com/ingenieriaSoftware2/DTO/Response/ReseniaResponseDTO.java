package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import java.util.UUID;

public record ReseniaResponseDTO(
        UUID id,
        IntercambioId intercambioId,
        UUID autorId,
        UUID calificadoId,
        float calificacion,
        String comentario
) {
}
