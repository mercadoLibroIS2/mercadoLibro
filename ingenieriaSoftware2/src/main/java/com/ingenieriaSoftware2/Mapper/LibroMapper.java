package com.ingenieriaSoftware2.Mapper;

import com.ingenieriaSoftware2.DTO.Request.LibroRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class LibroMapper {
    public Libro toEntity(LibroRequestDTO request, Usuario propietario) {
        if (request == null) {
            return null;
        }

        Libro libro = new Libro();
        libro.setTitulo(request.titulo());
        libro.setAutor(request.autor());
        libro.setIsbn(request.isbn());
        libro.setCategoria(request.categoria());
        libro.setEstadoFisico(request.estadoFisico());
        libro.setValorReferencia(request.valorReferencia());
        libro.setPropietario(propietario);
        libro.setDisponible(true);

        return libro;
    }

    public LibroResponseDTO toResponseDTO(Libro libro) {
        if (libro == null) {
            return null;
        }

        LibroResponseDTO dto = new LibroResponseDTO(
        libro.getId(),
        libro.getIsbn(),
        libro.getTitulo(),
        libro.getAutor(),
        libro.getCategoria(),
        libro.getEstadoFisico(),
        libro.getValorReferencia(),
        libro.getDisponible(),
        libro.getPropietario().getId()
        );
        return dto;
    }

    public List<LibroResponseDTO> toResponseDTOList(List<Libro> libros) {
        if (libros == null) {
            return null;
        }
        return libros.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    public Page<LibroResponseDTO> toResponseDTOPage(Page<Libro> page) {
        if (page == null) {
            return null;
        }
        return page.map(this::toResponseDTO);
    }

    public void updateEntity(Libro libro, LibroRequestDTO request) {
        if (libro == null || request == null) {
            return;
        }

        libro.setTitulo(request.titulo());
        libro.setAutor(request.autor());
        libro.setIsbn(request.isbn());
        libro.setCategoria(request.categoria());
        libro.setEstadoFisico(request.estadoFisico());
        libro.setValorReferencia(request.valorReferencia());
    }
}
