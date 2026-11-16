package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.CadenaIntercambio;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCadena;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Repository.CadenaIntercambioRepository;
import com.ingenieriaSoftware2.Repository.PublicacionRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.MovimientoPuntosService;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CadenaIntercambioServiceImplTest {

    @Mock
    private CadenaIntercambioRepository cadenaRepository;
    @Mock
    private PublicacionRepository publicacionRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private MovimientoPuntosService movimientoPuntosService;
    @Mock
    private NotificacionService notificacionService;

    @InjectMocks
    private CadenaIntercambioServiceImpl service;

    private final List<CadenaIntercambio> guardadas = new ArrayList<>();
    private final Map<String, Usuario> usuarios = new HashMap<>();
    private final Map<PublicacionId, Publicacion> publicaciones = new HashMap<>();

    private Usuario ana;
    private Usuario bruno;
    private Usuario carla;

    @BeforeEach
    void setUp() {
        ana = usuario("ana@test.com");
        bruno = usuario("bruno@test.com");
        carla = usuario("carla@test.com");

        // ana publica X (lo sigue bruno), bruno publica Y (lo sigue carla), carla publica Z (lo sigue ana)
        publicar(ana, "X", bruno);
        publicar(bruno, "Y", carla);
        publicar(carla, "Z", ana);

        when(cadenaRepository.findAll()).thenAnswer(inv -> new ArrayList<>(guardadas));
        when(cadenaRepository.save(any(CadenaIntercambio.class))).thenAnswer(inv -> {
            CadenaIntercambio c = inv.getArgument(0);
            if (c.getId() == null) {
                c.setId(UUID.randomUUID());
                guardadas.add(c);
            }
            return c;
        });
        when(cadenaRepository.findById(any())).thenAnswer(inv ->
                guardadas.stream().filter(c -> c.getId().equals(inv.getArgument(0))).findFirst());
        when(publicacionRepository.listarPorEstado(EstadoPublicacion.DISPONIBLE)).thenAnswer(inv ->
                publicaciones.values().stream().filter(p -> p.getEstadoPublicacion() == EstadoPublicacion.DISPONIBLE).toList());
        when(publicacionRepository.findById(any())).thenAnswer(inv -> Optional.ofNullable(publicaciones.get(inv.getArgument(0))));
        when(publicacionRepository.findByIdParaActualizar(any())).thenAnswer(inv -> Optional.ofNullable(publicaciones.get(inv.getArgument(0))));
        when(usuarioRepository.findByEmail(anyString())).thenAnswer(inv -> Optional.ofNullable(usuarios.get(inv.<String>getArgument(0))));
    }

    @Test
    void detectaCicloDeTresYLoMuestraSoloASusParticipantes() {
        List<CadenaIntercambioResponseDTO> deAna = service.listarCadenas(ana.getId());

        assertEquals(1, deAna.size());
        CadenaIntercambioResponseDTO cadena = deAna.get(0);
        assertEquals(EstadoCadena.PROPUESTA, cadena.estado());
        assertEquals(3, cadena.pasos().size());
        // ana entrega X a bruno, bruno entrega Y a carla, carla entrega Z a ana
        assertTrue(cadena.pasos().stream().anyMatch(p -> p.emailEntrega().equals("ana@test.com") && p.emailRecibe().equals("bruno@test.com") && p.isbn().equals("X")));
        assertTrue(cadena.pasos().stream().anyMatch(p -> p.emailEntrega().equals("carla@test.com") && p.emailRecibe().equals("ana@test.com") && p.isbn().equals("Z")));

        // Volver a listar no duplica la cadena
        assertEquals(1, service.listarCadenas(bruno.getId()).size());

        Usuario ajeno = usuario("otro@test.com");
        assertTrue(service.listarCadenas(ajeno.getId()).isEmpty());
    }

    @Test
    void sinCicloNoSeCreaCadena() {
        ana.getLibrosSeguidos().clear(); // se corta el ciclo
        publicaciones.values().stream().filter(p -> p.getId().getIsbn().equals("Z"))
                .forEach(p -> p.getLibro().getSeguidores().clear());

        assertTrue(service.listarCadenas(ana.getId()).isEmpty());
        verify(cadenaRepository, never()).save(any());
    }

    @Test
    void cuandoConfirmanTodosSeTransfierenLosLibrosYSeAcreditaElBono() {
        UUID id = service.listarCadenas(ana.getId()).get(0).id();

        assertEquals(EstadoCadena.EN_CURSO, service.aceptarCadena(id, ana.getId()).estado());
        assertThrows(ResponseStatusException.class, () -> service.aceptarCadena(id, ana.getId()));
        assertEquals(EstadoCadena.EN_CURSO, service.aceptarCadena(id, bruno.getId()).estado());
        CadenaIntercambioResponseDTO completada = service.aceptarCadena(id, carla.getId());

        assertEquals(EstadoCadena.COMPLETADA, completada.estado());
        assertTrue(publicaciones.values().stream().allMatch(p -> p.getEstadoPublicacion() == EstadoPublicacion.VENDIDA));
        verify(movimientoPuntosService, times(3)).acreditarBonificacionSistema(any(Usuario.class), eq(50), anyString());
        assertTrue(bruno.getLibrosSeguidos().isEmpty(), "bruno ya recibió X y deja de seguirlo");
    }

    @Test
    void siUnLibroYaNoEstaDisponibleLaCadenaSeCancela() {
        UUID id = service.listarCadenas(ana.getId()).get(0).id();
        service.aceptarCadena(id, ana.getId());
        service.aceptarCadena(id, bruno.getId());
        publicaciones.values().stream().filter(p -> p.getId().getIsbn().equals("Y"))
                .forEach(p -> p.setEstadoPublicacion(EstadoPublicacion.VENDIDA));

        assertEquals(EstadoCadena.CANCELADA, service.aceptarCadena(id, carla.getId()).estado());
        verify(movimientoPuntosService, never()).acreditarBonificacionSistema(any(), anyInt(), anyString());
    }

    @Test
    void unaCadenaRechazadaNoSeVuelveAProponer() {
        UUID id = service.listarCadenas(ana.getId()).get(0).id();
        assertEquals(EstadoCadena.CANCELADA, service.rechazarCadena(id, bruno.getId()).estado());

        List<CadenaIntercambioResponseDTO> despues = service.listarCadenas(ana.getId());
        assertEquals(1, despues.size());
        assertEquals(EstadoCadena.CANCELADA, despues.get(0).estado());
    }

    private Usuario usuario(String email) {
        Usuario u = new Usuario();
        u.setId(UUID.randomUUID());
        u.setEmail(email);
        u.setNombre(email.substring(0, email.indexOf('@')));
        u.setSaldoTotal(500);
        u.setSaldoReservado(0);
        usuarios.put(email, u);
        return u;
    }

    private void publicar(Usuario duenio, String isbn, Usuario seguidor) {
        Libro libro = new Libro();
        libro.setIsbn(isbn);
        libro.setTitulo("Libro " + isbn);
        libro.setAutores("Autor " + isbn);
        libro.getSeguidores().add(seguidor);
        seguidor.getLibrosSeguidos().add(libro);

        PublicacionId id = new PublicacionId(isbn, duenio.getEmail(), LocalDateTime.of(2026, 1, 1, 10, 0).plusMinutes(publicaciones.size()));
        Publicacion pub = new Publicacion();
        pub.setId(id);
        pub.setLibro(libro);
        pub.setPropietario(duenio);
        pub.setEstadoFisico(EstadoFisico.BUEN_ESTADO);
        pub.setValorPuntosSolicitado(100);
        pub.setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);
        publicaciones.put(id, pub);
    }
}
