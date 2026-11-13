package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Enums.EstadoCadena;

import java.util.List;
import java.util.UUID;

public record CadenaIntercambioResponseDTO(
        UUID id,
        Integer puntosBonus,
        EstadoCadena estado,
        List<String> participantesEmails
) {
}

