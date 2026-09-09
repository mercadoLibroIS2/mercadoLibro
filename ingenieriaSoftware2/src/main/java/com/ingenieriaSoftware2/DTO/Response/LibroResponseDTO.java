package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.CategoriaLibro;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import jakarta.persistence.Column;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public record LibroResponseDTO(
        String isbn,
        String titulo,
        String autor,
        List<CategoriaLibro> categoria,
        EstadoFisico estadoFisico,
        Integer valorReferencia,
        Boolean disponible,
        String propietario
) {
}
