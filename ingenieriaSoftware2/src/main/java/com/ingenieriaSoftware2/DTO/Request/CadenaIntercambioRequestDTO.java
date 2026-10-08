package com.ingenieriaSoftware2.DTO.Request;

import java.util.List;
import java.util.UUID;

public record CadenaIntercambioRequestDTO(
        Integer puntosBonus,
        List<UUID> intercambioIds
) {
}
