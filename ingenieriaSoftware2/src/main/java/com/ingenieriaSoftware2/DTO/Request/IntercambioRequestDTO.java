package com.ingenieriaSoftware2.DTO.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.LocalDateTime;

public record IntercambioRequestDTO(
        @NotBlank String isbnOfrecida,
        @NotNull LocalDateTime horaPublicacionOfrecida,
        @NotBlank String isbnSolicitada,
        @NotBlank String emailPropietarioSolicitada,
        @NotNull LocalDateTime horaPublicacionSolicitada,
        @PositiveOrZero Integer puntosComprometidos
) {
}
