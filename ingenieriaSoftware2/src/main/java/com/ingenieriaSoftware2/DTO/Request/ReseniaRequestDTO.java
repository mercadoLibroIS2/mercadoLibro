package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.UUID;

public record ReseniaRequestDTO(
        UUID intercambioId,
        UUID autorId,
        UUID calificado,
        float calificacion,
        String comentario
) {
}
