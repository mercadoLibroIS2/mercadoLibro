package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.External.GoogleBookItemDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Exception.Libro.LibroNoExisteException;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Service.External.GoogleBooksClient;
import com.ingenieriaSoftware2.Service.Interfaces.LibroService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class LibroServiceImpl implements LibroService {

    private static final Logger log = LoggerFactory.getLogger(LibroServiceImpl.class);
    private static final int DIAS_EXPIRACION_CACHE_BIBLIOGRAFICO = 30;
    private static final int DIAS_EXPIRACION_CACHE_PUNTUACION = 7;

    @Autowired
    private LibroRepository libroRepository;

    @Autowired
    private LibroMapper libroMapper;

    @Autowired
    private GoogleBooksClient googleBooksClient;

    @Override
    @Transactional
    public LibroResponseDTO obtenerOConsultarPorIsbn(String isbn) {
        if (isbn == null || isbn.isBlank()) {
            throw new IllegalArgumentException("El ISBN no puede ser nulo ni vacío");
        }

        String isbnLimpio = isbn.trim();
        Optional<Libro> libroOpt = libroRepository.findByIsbn(isbnLimpio);

        LocalDateTime ahora = LocalDateTime.now();

        if (libroOpt.isPresent()) {
            Libro libroExistente = libroOpt.get();
            boolean cacheValido = libroExistente.getFechaCacheBibliografico() != null
                    && libroExistente.getFechaCacheBibliografico().isAfter(ahora.minusDays(DIAS_EXPIRACION_CACHE_BIBLIOGRAFICO));

            if (cacheValido) {
                return libroMapper.toDTO(libroExistente);
            }

            // Si expiró el caché, intentamos refrescarlo desde Google Books
            try {
                return refrescarDesdeGoogleBooks(isbnLimpio);
            } catch (Exception e) {
                log.warn("No se pudo refrescar Google Books para ISBN {}. Retornando datos cacheados: {}", isbnLimpio, e.getMessage());
                return libroMapper.toDTO(libroExistente);
            }
        }

        // Si no existe localmente, lo buscamos en Google Books
        return refrescarDesdeGoogleBooks(isbnLimpio);
    }

    @Override
    @Transactional
    public LibroResponseDTO refrescarDesdeGoogleBooks(String isbn) {
        String isbnLimpio = isbn.trim();
        Optional<GoogleBookItemDTO> googleItemOpt = googleBooksClient.buscarPorIsbn(isbnLimpio);

        if (googleItemOpt.isEmpty()) {
            // Si ya existía local, devolvemos el existente
            return libroRepository.findByIsbn(isbnLimpio)
                    .map(libroMapper::toDTO)
                    .orElseThrow(() -> new LibroNoExisteException("No se encontró el libro con ISBN " + isbnLimpio + " en la base local ni en Google Books."));
        }

        GoogleBookItemDTO googleItem = googleItemOpt.get();
        GoogleBookItemDTO.VolumeInfo info = googleItem.volumeInfo();

        Libro libro = libroRepository.findByIsbn(isbnLimpio).orElseGet(() -> {
            Libro nuevo = new Libro();
            nuevo.setIsbn(isbnLimpio);
            nuevo.setCategorias(Collections.emptySet());
            return nuevo;
        });

        libro.setGoogleBooksId(googleItem.id());

        if (info != null) {
            if (info.title() != null && !info.title().isBlank()) {
                libro.setTitulo(info.title());
            }
            if (info.authors() != null && !info.authors().isEmpty()) {
                libro.setAutores(String.join(", ", info.authors()));
            }
            if (info.averageRating() != null) {
                libro.setPuntuacionExterna(info.averageRating());
                libro.setFechaCachePuntuacion(LocalDateTime.now());
            }
        }

        libro.setFechaCacheBibliografico(LocalDateTime.now());
        Libro guardado = libroRepository.save(libro);
        return libroMapper.toDTO(guardado);
    }

    @Override
    public List<GoogleBookItemDTO> buscarLibrosEnGoogle(String consulta, int limite) {
        return googleBooksClient.buscarPorTexto(consulta, limite);
    }
}
