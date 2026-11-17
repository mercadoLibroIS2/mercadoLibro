package com.ingenieriaSoftware2.DTO.Response;

import java.time.LocalDateTime;

public record ReseniaCompraResponseDTO(
        String compradorEmail,
        String isbn,
        String propietarioEmail,
        LocalDateTime horaPublicacion,
        boolean compradorReviewer,
        String emailReviewer,
        String emailReseniado,
        short calificacion,
        String comentario
) {
}
