package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.PublicacionRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.GoogleBookVolumeDTO;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Categoria;
import com.ingenieriaSoftware2.Repository.CategoriaRepository;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.ColorSemaforo;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Enums.TipoNotificacion;
import com.ingenieriaSoftware2.Exception.Intercambio.AccionNoPermitidaException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoDisponibleException;
import com.ingenieriaSoftware2.Mapper.PublicacionMapper;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Repository.PublicacionRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Implementations.Auxiliares.Calculadora;
import com.ingenieriaSoftware2.Service.Interfaces.GoogleBooksService;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicacionServiceImplTest {

    private static final PublicacionId ID =
            new PublicacionId("978-1", "duena@example.com", LocalDateTime.parse("2026-01-01T12:00:00"));

    @Mock
    private PublicacionRepository publicacionRepository;

    @Mock
    private IntercambioRepository intercambioRepository;

    @Mock
    private PublicacionMapper publicacionMapper;

    @Mock
    private Calculadora calculadora;

    @Mock
    private LibroRepository libroRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private GoogleBooksService googleBooksService;

    @Mock
    private NotificacionService notificacionService;

    @Mock
    private CategoriaRepository categoriaRepository;

    @InjectMocks
    private PublicacionServiceImpl publicacionService;

    @Test
    void publicarLibroImportadoUsaLaNuevaEscalaYNotificaSeguidores() {
        String isbn = "978-84-376-0457-2";
        Usuario propietario = new Usuario();
        propietario.setEmail("duena@example.com");

        Usuario seguidor = new Usuario();
        seguidor.setEmail("seguidor@example.com");

        when(usuarioRepository.findByEmail("duena@example.com")).thenReturn(Optional.of(propietario));
        when(libroRepository.findByIsbn(isbn)).thenReturn(Optional.empty());

        GoogleBookVolumeDTO volumeDTO = new GoogleBookVolumeDTO(
                "gb-1", isbn, "Cien años de soledad", "Gabriel García Márquez",
                "Desc", null, "Sudamericana", "1967", List.of("Ficción"), 400, 4.8
        );
        when(googleBooksService.buscarPorIsbn(isbn)).thenReturn(Optional.of(volumeDTO));
        when(libroRepository.save(any(Libro.class))).thenAnswer(inv -> {
            Libro l = inv.getArgument(0);
            l.setSeguidores(Set.of(seguidor, propietario));
            return l;
        });
        when(calculadora.calcular(isbn, EstadoFisico.NUEVO)).thenReturn(525);
        when(calculadora.calculadoraColor(100, 525)).thenReturn(ColorSemaforo.VERDE);
        when(publicacionRepository.save(any(Publicacion.class))).thenAnswer(inv -> inv.getArgument(0));

        PublicacionRequestDTO req = new PublicacionRequestDTO(isbn, EstadoFisico.NUEVO, 100, "Excelente", "Técnico");
        publicacionService.publicarLibro(req, "duena@example.com");

        ArgumentCaptor<Libro> libroCaptor = ArgumentCaptor.forClass(Libro.class);
        verify(libroRepository).save(libroCaptor.capture());
        assertEquals(525, libroCaptor.getValue().getValorReferencia());
        assertEquals(400, libroCaptor.getValue().getPaginas());
        assertEquals("Ficción", libroCaptor.getValue().getCategoriaReferencia());

        verify(notificacionService).crear(eq("seguidor@example.com"), eq(TipoNotificacion.LIBRO_SEGUIDO_PUBLICADO), contains("un libro que seguís"));
        verify(notificacionService, never()).crear(eq("duena@example.com"), any(), any());
    }

    @Test
    void publicarLibroSinValorReferenciaUsaLaEscalaComunSinExcepcionesPorIsbn() {
        String isbn = "978-987-566-646-7";
        Usuario propietario = new Usuario();
        propietario.setEmail("duena@example.com");

        Libro libroSinValor = new Libro();
        libroSinValor.setIsbn(isbn);
        libroSinValor.setValorReferencia(null);

        when(usuarioRepository.findByEmail("duena@example.com")).thenReturn(Optional.of(propietario));
        when(libroRepository.findByIsbn(isbn)).thenReturn(Optional.of(libroSinValor));
        when(calculadora.calcular(isbn, EstadoFisico.COMO_NUEVO)).thenReturn(450);
        when(calculadora.calculadoraColor(135, 450)).thenReturn(ColorSemaforo.VERDE);
        when(publicacionRepository.save(any(Publicacion.class))).thenAnswer(inv -> inv.getArgument(0));

        PublicacionRequestDTO req = new PublicacionRequestDTO(isbn, EstadoFisico.COMO_NUEVO, 135, "Como nuevo", null);
        publicacionService.publicarLibro(req, "duena@example.com");

        assertEquals(500, libroSinValor.getValorReferencia());
    }

    @Test
    void categoriaDelClienteNoPuedeModificarMetadatosDelIsbn() {
        String isbn = "9788420633114";
        Usuario propietario = new Usuario();
        propietario.setEmail("duena@example.com");
        Libro libro = new Libro();
        libro.setIsbn(isbn);
        when(usuarioRepository.findByEmail("duena@example.com")).thenReturn(Optional.of(propietario));
        when(libroRepository.findByIsbn(isbn)).thenReturn(Optional.of(libro));
        when(googleBooksService.buscarPorIsbn(isbn)).thenReturn(Optional.of(new GoogleBookVolumeDTO(
                "manual", isbn, "Manual", "Autor", "", null, "Editorial", "2026",
                List.of("Computers / Programming"), 500, 1.0)));
        when(calculadora.calcular(isbn, EstadoFisico.BUEN_ESTADO)).thenReturn(570);
        when(calculadora.calculadoraColor(70, 570)).thenReturn(ColorSemaforo.VERDE);
        when(publicacionRepository.save(any(Publicacion.class))).thenAnswer(inv -> inv.getArgument(0));

        publicacionService.publicarLibro(new PublicacionRequestDTO(isbn, EstadoFisico.BUEN_ESTADO, 70, "", "Infantil"), "duena@example.com");
        publicacionService.publicarLibro(new PublicacionRequestDTO(isbn, EstadoFisico.BUEN_ESTADO, 70, "", "Poesía"), "duena@example.com");
        assertEquals("Técnico", libro.getCategoriaReferencia());
        assertEquals(500, libro.getPaginas());
        assertEquals(715, libro.getValorReferencia());
        verify(googleBooksService).buscarPorIsbn(isbn);
        verifyNoInteractions(categoriaRepository);
    }

    @Test
    void listarDisponiblesConsultaSoloElEstadoDisponible() {
        when(publicacionRepository.listarPorEstado(EstadoPublicacion.DISPONIBLE)).thenReturn(List.of());

        publicacionService.listarPublicacionesDisponibles();

        verify(publicacionRepository).listarPorEstado(EstadoPublicacion.DISPONIBLE);
    }

    @Test
    void eliminarRechazaAlUsuarioQueNoEsDuenio() {
        assertThrows(AccionNoPermitidaException.class,
                () -> publicacionService.eliminarPublicacion(ID, "otra@example.com"));

        verifyNoInteractions(publicacionRepository, intercambioRepository);
    }

    @Test
    void eliminarRechazaPublicacionesReservadas() {
        Publicacion publicacion = new Publicacion();
        publicacion.setEstadoPublicacion(EstadoPublicacion.RESERVADA);
        when(publicacionRepository.findByIdParaActualizar(ID)).thenReturn(Optional.of(publicacion));

        assertThrows(PublicacionNoDisponibleException.class,
                () -> publicacionService.eliminarPublicacion(ID, ID.getEmailPropietario()));

        verifyNoInteractions(intercambioRepository);
    }

    @Test
    void eliminarRechazaPublicacionesConIntercambioActivo() {
        Publicacion publicacion = new Publicacion();
        publicacion.setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);
        when(publicacionRepository.findByIdParaActualizar(ID)).thenReturn(Optional.of(publicacion));
        when(intercambioRepository.existeIntercambioActivo(
                eq(ID.getIsbn()), eq(ID.getEmailPropietario()), eq(ID.getHoraPublicacion()), anyList()))
                .thenReturn(true);

        assertThrows(PublicacionNoDisponibleException.class,
                () -> publicacionService.eliminarPublicacion(ID, ID.getEmailPropietario()));
    }

    @Test
    void eliminarMarcaComoEliminadaSinBorrarElRegistroCuandoEstaDisponible() {
        Publicacion publicacion = new Publicacion();
        publicacion.setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);
        when(publicacionRepository.findByIdParaActualizar(ID)).thenReturn(Optional.of(publicacion));
        when(intercambioRepository.existeIntercambioActivo(
                eq(ID.getIsbn()), eq(ID.getEmailPropietario()), eq(ID.getHoraPublicacion()), anyList()))
                .thenReturn(false);

        publicacionService.eliminarPublicacion(ID, ID.getEmailPropietario());

        assertEquals(EstadoPublicacion.ELIMINADA, publicacion.getEstadoPublicacion());
        verify(intercambioRepository).existeIntercambioActivo(
                eq(ID.getIsbn()), eq(ID.getEmailPropietario()), eq(ID.getHoraPublicacion()), anyList());
    }
}
