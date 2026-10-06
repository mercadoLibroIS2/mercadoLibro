package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Enums.EstadoCompra;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

public record CompraResponseDTO(
        String isbn,
        String titulo,
        String emailVendedor,
        LocalDateTime horaPublicacion,
        String emailComprador,
        Integer puntos,
        EstadoCompra estado,
        Instant fecha,
        String infoEnvio,
        String motivoCancelacion
) {
}
