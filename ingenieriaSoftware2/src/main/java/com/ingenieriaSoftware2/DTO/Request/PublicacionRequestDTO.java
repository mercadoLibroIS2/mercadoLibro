package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Enums.EstadoFisico;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record PublicacionRequestDTO(
        @NotBlank
        String isbn,

        @NotNull
        EstadoFisico estadoFisico,

        @NotNull
        @Positive
        Long valorPuntosSolicitado,

        @Size(max = 500)
        String comentario
) {
}
