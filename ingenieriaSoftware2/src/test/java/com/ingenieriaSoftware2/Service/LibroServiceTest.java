package com.ingenieriaSoftware2.Service;

import com.ingenieriaSoftware2.DTO.Request.LibroRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.CategoriaLibro;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Implementations.LibroServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LibroServiceTest {

    @Mock
    private LibroRepository libroRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private LibroMapper libroMapper;

    @InjectMocks
    private LibroServiceImpl libroService;

    private Usuario usuario;
    private Libro libro;
    private LibroResponseDTO responseDTO;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        usuario.setId(UUID.randomUUID());
        usuario.setNombre("Franco");

        libro = new Libro();
        libro.setId(UUID.randomUUID());
        libro.setIsbn("978-84-376-0457-2");
        libro.setTitulo("Cien años de soledad");
        libro.setAutor("Gabriel García Márquez");
        libro.setDisponible(true);
        libro.setPropietario(usuario);
        libro.setEstadoFisico(EstadoFisico.NUEVO);
        libro.setValorReferencia(50);

        responseDTO = new LibroResponseDTO(
                libro.getId(),
                libro.getIsbn(),
                libro.getTitulo(),
                libro.getAutor(),
                List.of(CategoriaLibro.FICCION_GENERAL),
                libro.getEstadoFisico(),
                libro.getValorReferencia(),
                libro.getDisponible(),
                usuario.getId()
        );
    }

    @Test
    @DisplayName("Obtener libro por ID existente retorna LibroResponseDTO")
    void obtenerLibroPorId_existente_retornaDTO() {
        when(libroRepository.findById(libro.getId())).thenReturn(Optional.of(libro));
        when(libroMapper.toResponseDTO(libro)).thenReturn(responseDTO);

        LibroResponseDTO resultado = libroService.obtenerLibroPorId(libro.getId());

        assertNotNull(resultado);
        assertEquals(libro.getTitulo(), resultado.titulo());
    }

    @Test
    @DisplayName("Obtener sugerencias llama a findSuggestionsByTitulo con limite adecuado")
    void obtenerSugerencias_retornaTitulos() {
        when(libroRepository.findSuggestionsByTitulo(eq("Cien"), any(Pageable.class)))
                .thenReturn(List.of("Cien años de soledad"));

        List<String> sugerencias = libroService.obtenerSugerencias("Cien", 5);

        assertNotNull(sugerencias);
        assertEquals(1, sugerencias.size());
        assertEquals("Cien años de soledad", sugerencias.get(0));
    }

    @Test
    @DisplayName("Buscar libros con filtros llama al repositorio y mapea a página")
    void buscarLibros_conFiltros_retornaPagina() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Libro> paginaLibros = new PageImpl<>(List.of(libro));
        Page<LibroResponseDTO> paginaDTO = new PageImpl<>(List.of(responseDTO));

        when(libroRepository.buscarConFiltros("Cien", CategoriaLibro.FICCION_GENERAL, EstadoFisico.NUEVO, 10, 100, pageable))
                .thenReturn(paginaLibros);
        when(libroMapper.toResponseDTOPage(paginaLibros)).thenReturn(paginaDTO);

        Page<LibroResponseDTO> resultado = libroService.buscarLibros(
                "Cien", "FICCION_GENERAL", EstadoFisico.NUEVO, 10, 100, pageable
        );

        assertNotNull(resultado);
        assertEquals(1, resultado.getTotalElements());
        assertEquals("Cien años de soledad", resultado.getContent().get(0).titulo());
    }

    @Test
    @DisplayName("Eliminar libro lanza excepcion si el usuario no es propietario")
    void eliminarLibro_usuarioNoEsPropietario_lanzaExcepcion() {
        UUID otroUsuarioId = UUID.randomUUID();
        when(libroRepository.findById(libro.getId())).thenReturn(Optional.of(libro));

        assertThrows(IllegalStateException.class, () ->
                libroService.eliminarLibro(libro.getId(), otroUsuarioId)
        );

        verify(libroRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Eliminar libro exitoso cuando el usuario es propietario y está disponible")
    void eliminarLibro_propietario_eliminaLibro() {
        when(libroRepository.findById(libro.getId())).thenReturn(Optional.of(libro));

        libroService.eliminarLibro(libro.getId(), usuario.getId());

        verify(libroRepository).delete(libro);
    }
}
