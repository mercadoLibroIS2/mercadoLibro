package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

public record PublicacionIdParams(
        @NotBlank String isbn,
        @NotBlank String emailPropietario,
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime horaPublicacion
) {
    public PublicacionId toId() {
        return new PublicacionId(isbn, emailPropietario, horaPublicacion);
    }
}