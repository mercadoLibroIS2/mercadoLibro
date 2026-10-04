package com.ingenieriaSoftware2.DTO.Response;

import java.util.UUID;

public record PerfilResponseDTO(
        UUID id,
        String nombre,
        String email,
        String rol,
        java.math.BigDecimal saldoTotal,
        java.math.BigDecimal saldoReservado,
        java.math.BigDecimal saldoDisponible,
        java.math.BigDecimal reputacionPromedio
) {
}
