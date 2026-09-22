package com.ingenieriaSoftware2.DTO.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;


public record LoginRequestDTO(
        @NotBlank(message = "El usuario o email es obligatorio")
        String nombreOEmail,

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        String contrasenia
) {
}
