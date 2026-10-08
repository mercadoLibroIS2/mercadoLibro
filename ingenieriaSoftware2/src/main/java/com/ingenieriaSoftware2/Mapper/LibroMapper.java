package com.ingenieriaSoftware2.Mapper;

import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Entity.Categoria;
import com.ingenieriaSoftware2.Entity.Libro;
import org.springframework.stereotype.Component;

@Component
public class LibroMapper {
    public LibroResponseDTO toDTO(Libro libro){
        LibroResponseDTO dto = new LibroResponseDTO(
                libro.getIsbn(),
                libro.getTitulo(),
                libro.getAutores(),
                libro.getCategorias().stream()
                        .map(Categoria::getNombre)
                        .toList(),
                libro.getValorReferencia(),
                libro.getPuntuacionExterna()
        );
        return dto;
    }
}
