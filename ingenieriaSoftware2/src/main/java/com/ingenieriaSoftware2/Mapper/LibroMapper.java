package com.ingenieriaSoftware2.Mapper;

import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Service.Implementations.Auxiliares.PoliticaPuntos;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class LibroMapper {
    public LibroResponseDTO toDTO(Libro libro){
        LibroResponseDTO dto = new LibroResponseDTO(
                libro.getIsbn(),
                libro.getTitulo(),
                libro.getAutores(),
                List.of(PoliticaPuntos.categoria(libro)),
                PoliticaPuntos.referencia(libro, EstadoFisico.NUEVO),
                libro.getPuntuacionExterna()
        );
        return dto;
    }
}
