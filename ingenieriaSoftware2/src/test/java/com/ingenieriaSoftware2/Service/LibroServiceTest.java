package com.ingenieriaSoftware2.Service;

import com.ingenieriaSoftware2.DTO.Response.GoogleBookVolumeDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Service.Implementations.LibroServiceImpl;
import com.ingenieriaSoftware2.Service.Interfaces.GoogleBooksService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LibroServiceTest {

    @Mock
    private LibroRepository libroRepository;

    @Mock
    private GoogleBooksService googleBooksService;

    @Mock
    private LibroMapper libroMapper;

    @InjectMocks
    private LibroServiceImpl libroService;

    private Libro libro;
    private LibroResponseDTO responseDTO;

    @BeforeEach
    void setUp() {
        libro = new Libro();
        libro.setIsbn("9780132350884");
        libro.setTitulo("Clean Code");
        libro.setAutores("Robert C. Martin");
        libro.setValorReferencia(15);
        libro.setPuntuacionExterna(BigDecimal.valueOf(4.5));

        responseDTO = new LibroResponseDTO(
                "9780132350884",
                "Clean Code",
                "Robert C. Martin",
                List.of("INGENIERIA_SOFTWARE"),
                15,
                BigDecimal.valueOf(4.5)
        );
    }

    @Test
    @DisplayName("Obtener libro por ISBN existente devuelve DTO")
    void obtenerLibroPorIsbn_existente_devuelveDTO() {
        when(libroRepository.findByIsbn("9780132350884")).thenReturn(Optional.of(libro));
        when(libroMapper.toDTO(libro)).thenReturn(responseDTO);

        Optional<LibroResponseDTO> resultado = libroService.obtenerLibroPorIsbn("9780132350884");

        assertTrue(resultado.isPresent());
        assertEquals("Clean Code", resultado.get().titulo());
    }

    @Test
    @DisplayName("Obtener o crear libro existente en BD lo retorna directamente")
    void obtenerOCrearLibro_existenteEnBD_retornaSinConsultarGoogle() {
        when(libroRepository.findByIsbn("9780132350884")).thenReturn(Optional.of(libro));

        Libro resultado = libroService.obtenerOCrearLibro("9780132350884", null, null);

        assertNotNull(resultado);
        assertEquals("Clean Code", resultado.getTitulo());
        verify(googleBooksService, never()).buscarPorIsbn(any());
    }

    @Test
    @DisplayName("Obtener o crear libro inexistente consulta Google Books y guarda")
    void obtenerOCrearLibro_noExiste_consultaGoogleBooksYGuarda() {
        when(libroRepository.findByIsbn("9780132350884")).thenReturn(Optional.empty());
        GoogleBookVolumeDTO gBook = new GoogleBookVolumeDTO(
                "9780132350884",
                "Clean Code",
                "Robert C. Martin",
                "A Handbook of Agile Software Craftsmanship",
                "http://cover.jpg",
                "Prentice Hall",
                "2008",
                List.of("Computers"),
                464,
                4.5
        );
        when(googleBooksService.buscarPorIsbn("9780132350884")).thenReturn(Optional.of(gBook));
        when(libroRepository.save(any(Libro.class))).thenAnswer(i -> i.getArgument(0));

        Libro resultado = libroService.obtenerOCrearLibro("9780132350884", null, null);

        assertNotNull(resultado);
        assertEquals("Clean Code", resultado.getTitulo());
        assertEquals("Robert C. Martin", resultado.getAutores());
        verify(libroRepository).save(any(Libro.class));
    }
}
