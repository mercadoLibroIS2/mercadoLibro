package com.ingenieriaSoftware2.DTO.Request;

import com.ingenieriaSoftware2.Enums.CategoriaLibro;
import com.ingenieriaSoftware2.Enums.EstadoFisico;

import java.util.List;
import java.util.UUID;

public record LibroRequestDTO(
        String isbn,
        String titulo,
        String autor,
        List<CategoriaLibro> categoria,
        EstadoFisico estadoFisico,
        Integer valorReferencia,
        Boolean disponible,
        UUID propietario
) {
}
