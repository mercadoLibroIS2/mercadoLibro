package com.ingenieriaSoftware2.DTO.Request;

import java.util.UUID;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Enums.TipoMovimiento;

public record MovimientoPuntosRequestDTO(
        UUID usuarioID,
        IntercambioId intercambioID,
        TipoMovimiento tipo,
        Integer cantidad
) {
}
