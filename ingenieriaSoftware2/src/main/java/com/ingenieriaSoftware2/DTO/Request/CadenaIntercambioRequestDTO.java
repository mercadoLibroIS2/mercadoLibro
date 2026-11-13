package com.ingenieriaSoftware2.DTO.Request;

import java.util.List;

public record CadenaIntercambioRequestDTO(
        List<String> participantesEmails,
        Integer puntosBonus
) {
}

