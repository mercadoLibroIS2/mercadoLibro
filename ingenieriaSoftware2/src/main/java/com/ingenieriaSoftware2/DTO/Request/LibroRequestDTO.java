package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Entity.CategoriaLibro;
import com.ingenieriaSoftware2.Enums.CalidadLibro;

import java.util.List;
import java.util.UUID;

public record LibroRequestDTO(
        String isbn,
        String titulo,
        String autor,
        List<CategoriaLibro> categoria,
        CalidadLibro calidadLibro,
        Integer valorReferencia,
        Boolean disponible,
        UUID propietario
) {
}
