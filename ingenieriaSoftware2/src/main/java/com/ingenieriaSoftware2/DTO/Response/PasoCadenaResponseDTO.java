package com.ingenieriaSoftware2.DTO.Response;

import java.util.UUID;

public record PasoCadenaResponseDTO(
        UUID usuarioId,
        String usuarioNombre,
        String usuarioEmail,
        LibroResponseDTO libroQueEntrega,
        LibroResponseDTO libroQueRecibe,
        boolean confirmado,
        String intercambioId
) {
}
