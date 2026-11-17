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
        Integer valorPuntosSolicitado,

        @Size(max = 255)
        String comentario,

        // Opcional: si el libro todavía no tiene categoría, se le asigna esta
        @Size(max = 100)
        String categoria
) {
}
