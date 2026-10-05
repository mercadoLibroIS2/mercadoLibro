package com.ingenieriaSoftware2.DTO.Request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CompraRequestDTO(
        @NotNull(message = "El libro es obligatorio")
        String libroId,

        @Min(value = 1, message = "La cantidad debe ser al menos 1")
        int cantidad,

        @NotBlank(message = "La dirección de envío es obligatoria")
        String direccionEnvio,

        String metodoPago
) {
}
