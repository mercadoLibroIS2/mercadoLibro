package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Enums.TipoMovimiento;

import java.util.UUID;

public record MovimientoPuntosResponseDTO(
        UUID id,
        String usuarioID,
        IntercambioId intercambioID,
        TipoMovimiento tipo,
        Integer cantidad
) {
}
