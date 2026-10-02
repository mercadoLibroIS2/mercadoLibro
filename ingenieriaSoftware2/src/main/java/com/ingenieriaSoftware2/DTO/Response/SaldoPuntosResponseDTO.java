package com.ingenieriaSoftware2.DTO.Response;

public record SaldoPuntosResponseDTO(
        Integer saldoTotal,
        Integer saldoReservado,
        Integer saldoDisponible
) {
}