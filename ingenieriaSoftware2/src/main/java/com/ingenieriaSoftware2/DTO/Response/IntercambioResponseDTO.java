package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;

import java.math.BigDecimal;

public record IntercambioResponseDTO(
	IntercambioId id,
	EstadoIntercambio estado,
	BigDecimal puntosComprometidos
) {
}
