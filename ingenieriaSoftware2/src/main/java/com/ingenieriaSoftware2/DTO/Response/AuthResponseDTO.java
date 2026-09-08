package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Enums.Rol;

public record AuthResponseDTO(
        String email,
        String token,
        String username,
        Rol rol,
        Integer puntos
) {
}
