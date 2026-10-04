package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record IntercambioRequestDTO(
	@Valid @NotNull IntercambioId id,
	@NotNull BigDecimal puntosComprometidos
) {
}
