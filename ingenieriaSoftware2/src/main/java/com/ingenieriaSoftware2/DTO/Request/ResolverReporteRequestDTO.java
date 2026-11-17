package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Enums.AccionAdmin;
import com.ingenieriaSoftware2.Enums.EstadoReporte;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ResolverReporteRequestDTO(
        @NotNull(message = "Indicá el nuevo estado") EstadoReporte estado,
        @Size(max = 1000) String resolucion,
        AccionAdmin accion
) {
}
