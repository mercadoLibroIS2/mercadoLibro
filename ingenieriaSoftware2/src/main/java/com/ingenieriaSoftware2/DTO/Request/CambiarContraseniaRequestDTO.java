package com.ingenieriaSoftware2.DTO.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CambiarContraseniaRequestDTO(@NotBlank String contraseniaActual,
                                           @NotBlank @Size(min = 8) String contraseniaNueva) {
}
