package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ReseniaRequestDTO(
        IntercambioId intercambioId,
        @NotNull
        @Min(value = 1, message = "La calificación mínima es 1")
        @Max(value = 5, message = "La calificación máxima es 5")
        Short calificacion,
        String comentario
) {
}
