package com.ingenieriaSoftware2.DTO.Response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CompraResponseDTO(
        Long id,

        Long libroId,
        String tituloLibro,

        Long compradorId,
        String nombreComprador,

        Long vendedorId,
        String nombreVendedor,

        BigDecimal precioUnitario,
        int cantidad,
        BigDecimal total
) {
}
