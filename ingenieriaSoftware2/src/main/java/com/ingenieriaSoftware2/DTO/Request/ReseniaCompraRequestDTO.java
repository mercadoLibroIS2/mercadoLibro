package com.ingenieriaSoftware2.DTO.Request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record ReseniaCompraRequestDTO(
        @NotBlank String compradorEmail,
        @NotBlank String isbn,
        @NotBlank String propietarioEmail,
        @NotNull LocalDateTime horaPublicacion,
        @NotNull @Min(1) @Max(5) Short calificacion,
        @Size(max = 255) String comentario
) {
}
