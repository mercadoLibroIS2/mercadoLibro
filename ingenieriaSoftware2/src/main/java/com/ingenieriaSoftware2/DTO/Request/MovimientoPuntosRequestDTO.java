package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.TipoMovimiento;
import jakarta.persistence.*;

import java.util.UUID;

public record MovimientoPuntosRequestDTO(
        UUID usuarioID,
        UUID intercambioID,
        TipoMovimiento tipo,
        Integer cantidad
) {
}
