package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;

public record ReseniaResponseDTO(
        IntercambioId intercambioId,
        boolean solicitanteReviewer,
        String emailReviewer,
        String emailReseniado,
        @jakarta.validation.constraints.Min(value = 1, message = "La calificación mínima es 1") @jakarta.validation.constraints.Max(value = 5, message = "La calificación máxima es 5") short calificacion,
        String comentario
) {
}
