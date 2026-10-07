package com.ingenieriaSoftware2.DTO.Request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record CompraRequestDTO(
        @NotBlank String isbn,
        @NotBlank String emailPropietario,
        @NotNull LocalDateTime horaPublicacion
) {
}
