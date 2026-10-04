package com.ingenieriaSoftware2.DTO.Response;

public record SaldoPuntosResponseDTO(
        java.math.BigDecimal saldoTotal,
        java.math.BigDecimal saldoReservado,
        java.math.BigDecimal saldoDisponible
) {
}