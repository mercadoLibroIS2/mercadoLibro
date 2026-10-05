package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Enums.EstadoIntercambio;

import java.time.LocalDateTime;

public record IntercambioResponseDTO(
        String isbnOfrecida,
        String tituloOfrecido,
        String propietarioOfrecida,
        LocalDateTime horaPublicacionOfrecida,
        String isbnSolicitada,
        String tituloSolicitado,
        String propietarioSolicitada,
        LocalDateTime horaPublicacionSolicitada,
        EstadoIntercambio estado,
        Integer puntosComprometidos,
        String motivoRechazo
) {
}
