package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Enums.EstadoFisico;

import java.time.LocalDateTime;

public record CadenaPasoResponseDTO(
        String emailEntrega,
        String nombreEntrega,
        String emailRecibe,
        String isbn,
        LocalDateTime horaPublicacion,
        String titulo,
        String autor,
        EstadoFisico estadoFisico,
        Integer valorPuntosSolicitado,
        boolean confirmado
) {
}
