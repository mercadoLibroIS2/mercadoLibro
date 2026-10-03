package com.ingenieriaSoftware2.DTO.Response;

import java.time.LocalDateTime;

public record MovimientoPuntosResponseDTO(
        String tipo,
        Long monto,
        String origen,
        LocalDateTime fecha
) {
}