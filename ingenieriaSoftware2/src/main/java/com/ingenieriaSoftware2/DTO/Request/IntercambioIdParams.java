package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

public record IntercambioIdParams(
        @NotBlank String isbnSolicitada,
        @NotBlank String propietarioSolicitada,
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime horaSolicitada,
        @NotBlank String isbnOfrecida,
        @NotBlank String propietarioOfrecida,
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime horaOfrecida
) {
    public IntercambioId toId() {
        return new IntercambioId(
                isbnSolicitada, propietarioSolicitada, horaSolicitada,
                isbnOfrecida, propietarioOfrecida, horaOfrecida
        );
    }
}
