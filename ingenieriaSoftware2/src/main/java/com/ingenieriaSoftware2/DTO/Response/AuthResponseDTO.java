package com.ingenieriaSoftware2.DTO.Response;

import java.util.UUID;

public record AuthResponseDTO(
        UUID id,
        String token,
        String username,
        String email,
        String rol,
        Integer puntos
) {
}
