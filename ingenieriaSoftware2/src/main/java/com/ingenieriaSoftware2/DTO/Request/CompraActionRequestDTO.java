package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Entity.Ids.CompraId;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record CompraActionRequestDTO(
        @Valid @NotNull CompraId id
) {
}
