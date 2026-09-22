package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Enums.TipoMovimiento;

import java.util.UUID;

public record MovimientoPuntosResponseDTO(
        UUID id,
        UUID usuarioID,
        UUID intercambioID,
        TipoMovimiento tipo,
        Integer cantidad
) {
}
