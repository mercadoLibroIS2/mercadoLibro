package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.External.GoogleBookItemDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Exception.Libro.LibroNoExisteException;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Service.External.GoogleBooksClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LibroServiceImplTest {

    @Mock
    private LibroRepository libroRepository;

    @Mock
    private GoogleBooksClient googleBooksClient;

    @Spy
    private LibroMapper libroMapper;

    @InjectMocks
    private LibroServiceImpl libroService;

    private Libro libroEnBase;

    @BeforeEach
    void setUp() {
        libroEnBase = new Libro();
        libroEnBase.setIsbn("9780132350884");
        libroEnBase.setTitulo("Clean Code");
        libroEnBase.setAutores("Robert C. Martin");
        libroEnBase.setCategorias(Collections.emptySet());
        libroEnBase.setFechaCacheBibliografico(LocalDateTime.now().minusDays(5));
    }

    @Test
    void obtenerOConsultarPorIsbn_UsaCacheSiEstaVigente() {
        when(libroRepository.findByIsbn("9780132350884")).thenReturn(Optional.of(libroEnBase));

        LibroResponseDTO resultado = libroService.obtenerOConsultarPorIsbn("9780132350884");

        assertNotNull(resultado);
        assertEquals("Clean Code", resultado.titulo());
        assertEquals("9780132350884", resultado.isbn());
        verify(googleBooksClient, never()).buscarPorIsbn(any());
    }

    @Test
    void obtenerOConsultarPorIsbn_ConsultaGoogleSiNoEstaEnBase() {
        when(libroRepository.findByIsbn("9789999999999")).thenReturn(Optional.empty());

        GoogleBookItemDTO.VolumeInfo volumeInfo = new GoogleBookItemDTO.VolumeInfo(
                "Refactoring",
                List.of("Martin Fowler"),
                "A book about refactoring",
                List.of("Computers"),
                BigDecimal.valueOf(4.8),
                12,
                null,
                null
        );
        GoogleBookItemDTO googleItem = new GoogleBookItemDTO("googleId123", volumeInfo);

        when(googleBooksClient.buscarPorIsbn("9789999999999")).thenReturn(Optional.of(googleItem));
        when(libroRepository.save(any(Libro.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LibroResponseDTO resultado = libroService.obtenerOConsultarPorIsbn("9789999999999");

        assertNotNull(resultado);
        assertEquals("Refactoring", resultado.titulo());
        assertEquals("Martin Fowler", resultado.autores());
        assertEquals(BigDecimal.valueOf(4.8), resultado.puntuacionExterna());
        verify(libroRepository).save(any(Libro.class));
    }

    @Test
    void obtenerOConsultarPorIsbn_LanzaExcepcionSiNoExisteEnNingunLado() {
        when(libroRepository.findByIsbn("0000000000000")).thenReturn(Optional.empty());
        when(googleBooksClient.buscarPorIsbn("0000000000000")).thenReturn(Optional.empty());

        assertThrows(LibroNoExisteException.class, () ->
                libroService.obtenerOConsultarPorIsbn("0000000000000")
        );
    }
}
