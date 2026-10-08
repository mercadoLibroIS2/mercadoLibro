package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Response.GoogleBookVolumeDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Service.Interfaces.GoogleBooksService;
import com.ingenieriaSoftware2.Service.Interfaces.LibroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class LibroServiceImpl implements LibroService {

    @Autowired
    private LibroRepository libroRepository;

    @Autowired
    private GoogleBooksService googleBooksService;

    @Autowired
    private LibroMapper libroMapper;

    @Override
    public Optional<LibroResponseDTO> obtenerLibroPorIsbn(String isbn) {
        if (isbn == null || isbn.trim().isEmpty()) {
            return Optional.empty();
        }
        return libroRepository.findByIsbn(isbn).map(libroMapper::toDTO);
    }

    @Override
    public Libro obtenerOCrearLibro(String isbn, String tituloOpcional, String autorOpcional) {
        if (isbn == null || isbn.trim().isEmpty()) {
            throw new IllegalArgumentException("El ISBN no puede ser nulo ni vacío");
        }
        return libroRepository.findByIsbn(isbn).orElseGet(() -> {
            Optional<GoogleBookVolumeDTO> gBook = googleBooksService.buscarPorIsbn(isbn);
            Libro nuevo = new Libro();
            nuevo.setIsbn(isbn);

            if (gBook.isPresent()) {
                GoogleBookVolumeDTO gb = gBook.get();
                nuevo.setGoogleBooksId(gb.isbn() != null ? gb.isbn() : isbn);
                nuevo.setTitulo(gb.titulo() != null && !gb.titulo().isEmpty() ? gb.titulo() : (tituloOpcional != null ? tituloOpcional : "Libro sin título"));
                nuevo.setAutores(gb.autor() != null && !gb.autor().isEmpty() ? gb.autor() : (autorOpcional != null ? autorOpcional : "Autor desconocido"));
                nuevo.setPuntuacionExterna(gb.ratingExterno() != null && gb.ratingExterno() > 0 ? BigDecimal.valueOf(gb.ratingExterno()) : BigDecimal.valueOf(4.0));
                nuevo.setValorReferencia(10);
            } else {
                nuevo.setGoogleBooksId(isbn);
                nuevo.setTitulo(tituloOpcional != null ? tituloOpcional : "Libro " + isbn);
                nuevo.setAutores(autorOpcional != null ? autorOpcional : "Autor Desconocido");
                nuevo.setPuntuacionExterna(BigDecimal.valueOf(4.0));
                nuevo.setValorReferencia(10);
            }
            nuevo.setFechaCacheBibliografico(LocalDateTime.now());
            nuevo.setFechaCachePuntuacion(LocalDateTime.now());
            return libroRepository.save(nuevo);
        });
    }

    @Override
    public List<LibroResponseDTO> listarLibrosCatalogo() {
        return libroRepository.findAll().stream()
                .map(libroMapper::toDTO)
                .toList();
    }
}
