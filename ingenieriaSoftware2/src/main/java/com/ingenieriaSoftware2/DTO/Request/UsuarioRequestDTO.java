package com.ingenieriaSoftware2.DTO.Request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;


public record UsuarioRequestDTO(
        @NotBlank(message = "El nombre de usuario es obligatorio")
        @Size(min = 3,message = "El nombre de usuario debe tener al menos 3 caracteres")
        String nombre,

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email debe tener un formato válido")
        String email,

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        String contrasenia
) {
}
