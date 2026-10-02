package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Enums.TipoMovimiento;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import java.util.UUID;

public record MovimientoPuntosResponseDTO(
        UUID id,
        UUID usuarioID,
        IntercambioId intercambioID,
        TipoMovimiento tipo,
        Integer cantidad
) {
}
