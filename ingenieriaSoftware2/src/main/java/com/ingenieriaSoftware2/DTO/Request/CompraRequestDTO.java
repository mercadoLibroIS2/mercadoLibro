package com.ingenieriaSoftware2.DTO.Request;

import jakarta.validation.constraints.NotBlank;

public record CompraRequestDTO(@NotBlank String isbn) {
}
