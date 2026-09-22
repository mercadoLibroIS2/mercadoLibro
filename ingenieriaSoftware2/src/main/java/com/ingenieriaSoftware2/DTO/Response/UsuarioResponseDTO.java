package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Repository.IntercambioRepository;

import java.util.UUID;

public record UsuarioResponseDTO(
        UUID id,
        String nombre,
        String email,
        Integer saldoDisponibles,
        boolean esActivo
) {
}
