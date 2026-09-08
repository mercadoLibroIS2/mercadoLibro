package com.ingenieriaSoftware2.DTO.Response;

public record AuthResponseDTO(
        String email,
        String token,
        String username,
        String rol,
        Integer puntos
) {
}
