package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

public record CompraIdParams(
        @NotBlank String compradorEmail,
        @NotBlank String isbn,
        @NotBlank String propietarioEmail,
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime horaPublicacion
) {
    public CompraId toId() {
        return new CompraId(compradorEmail, isbn, propietarioEmail, horaPublicacion);
    }
}
