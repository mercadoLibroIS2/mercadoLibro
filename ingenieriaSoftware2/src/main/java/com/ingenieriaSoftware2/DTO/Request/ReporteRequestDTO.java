package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Enums.MotivoReporte;
import com.ingenieriaSoftware2.Enums.TipoReporte;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record ReporteRequestDTO(
        @NotNull(message = "Elegí qué querés reportar") TipoReporte tipo,
        @NotNull(message = "Elegí un motivo") MotivoReporte motivo,
        @Size(min = 10, max = 1000, message = "Contá qué pasó (entre 10 y 1000 caracteres)") String detalle,
        String emailDenunciado,
        String isbn,
        LocalDateTime horaPublicacion,
        @Valid IntercambioIdParams intercambio
) {
}
