package com.ingenieriaSoftware2.DTO.Response;

import java.util.UUID;

public record PerfilResponseDTO(
        UUID id,
        String nombre,
        String email,
        String rol,
        Integer saldoTotal,
        Integer saldoReservado,
        Integer saldoDisponible,
        Float reputacionPromedio
) {
}
