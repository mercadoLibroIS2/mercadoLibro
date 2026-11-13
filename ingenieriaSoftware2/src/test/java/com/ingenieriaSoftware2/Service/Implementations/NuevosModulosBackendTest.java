package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.CadenaIntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.ReseniaRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.MovimientoPuntosResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.PerfilResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.ReseniaResponseDTO;
import com.ingenieriaSoftware2.Entity.*;
import com.ingenieriaSoftware2.Entity.Ids.*;
import com.ingenieriaSoftware2.Enums.*;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Mapper.ReseniaMapper;
import com.ingenieriaSoftware2.Mapper.UsuarioMapper;
import com.ingenieriaSoftware2.Repository.*;
import com.ingenieriaSoftware2.Service.Implementations.Auxiliares.Calculadora;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import com.ingenieriaSoftware2.Service.Interfaces.UsuarioService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NuevosModulosBackendTest {

    // --- Calculadora ---
    @Mock
    private LibroRepository libroRepository;

    @InjectMocks
    private Calculadora calculadora;

    // --- MovimientoPuntosServiceImpl ---
    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private EventoSistemaRepository eventoSistemaRepository;

    @Mock
    private MovimientoPuntosSistemaRepository movimientoPuntosSistemaRepository;

    @Mock
    private MovimientoPuntosCompraRepository movimientoPuntosCompraRepository;

    @Mock
    private MovimientoPuntosIntercambioRepository movimientoPuntosIntercambioRepository;

    @Mock
    private MovimientoPuntosReseniaRepository movimientoPuntosReseniaRepository;

    @Mock
    private UsuarioService usuarioServiceMock;

    @InjectMocks
    private MovimientoPuntosServiceImpl movimientoPuntosService;

    // --- NotificacionServiceImpl ---
    @Mock
    private NotificacionRepository notificacionRepository;

    @InjectMocks
    private NotificacionServiceImpl notificacionService;

    // --- ReseniaServiceImpl ---
    @Mock
    private ReseniaRepository reseniaRepository;

    @Mock
    private IntercambioRepository intercambioRepository;

    @Mock
    private ReseniaMapper reseniaMapper;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private NotificacionService notificacionServiceMock;

    @InjectMocks
    private ReseniaServiceImpl reseniaService;

    // --- UsuarioServiceImpl ---
    @Mock
    private UsuarioMapper usuarioMapper;

    @Mock
    private LibroMapper libroMapper;

    @InjectMocks
    private UsuarioServiceImpl usuarioService;

    // --- CadenaIntercambioServiceImpl ---
    @Mock
    private CadenaIntercambioRepository cadenaIntercambioRepository;

    @InjectMocks
    private CadenaIntercambioServiceImpl cadenaIntercambioService;

    @AfterEach
    void limpiarSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void calculadoraUsaRespaldo100CuandoValorReferenciaEsNuloYCalculaColoresSemaforo() {
        Libro libro = new Libro();
        libro.setIsbn("978-0");
        libro.setValorReferencia(null);
        when(libroRepository.findById("978-0")).thenReturn(Optional.of(libro));

        Integer calculadoNuevo = calculadora.calcular("978-0", EstadoFisico.NUEVO);
        Integer calculadoBuenEstado = calculadora.calcular("978-0", EstadoFisico.BUEN_ESTADO);

        assertEquals(100, calculadoNuevo);
        assertEquals(80, calculadoBuenEstado);

        assertEquals(ColorSemaforo.VERDE, calculadora.calculadoraColor(100, 100));
        assertEquals(ColorSemaforo.VERDE, calculadora.calculadoraColor(110, 100));
        assertEquals(ColorSemaforo.AMARILLO, calculadora.calculadoraColor(125, 100));
        assertEquals(ColorSemaforo.ROJO, calculadora.calculadoraColor(150, 100));
    }

    @Test
    void obtenerHistorialDevuelveFechasNoNulasParaTodosLosTiposDeMovimiento() {
        UUID userId = UUID.randomUUID();
        Usuario usuario = new Usuario();
        usuario.setId(userId);
        when(usuarioServiceMock.getUsuarioActual()).thenReturn(usuario);

        EventoSistemaId eventoId = new EventoSistemaId(TipoEventoSistema.ALTA_INICIAL, LocalDateTime.now().minusDays(3));
        MovimientoPuntosSistema movSistema = new MovimientoPuntosSistema();
        movSistema.setMovimientoPuntosSistemaId(new MovimientoPuntosSistemaId(eventoId, userId, TipoMovimiento.INGRESO));
        movSistema.setMonto(500L);
        when(movimientoPuntosSistemaRepository.findByMovimientoPuntosSistemaId_UsuarioId(userId))
                .thenReturn(List.of(movSistema));

        MovimientoPuntosCompra movCompra = new MovimientoPuntosCompra();
        MovimientoPuntosCompraId compraId = new MovimientoPuntosCompraId();
        compraId.setUsuarioId(userId);
        compraId.setTipoMovimiento(TipoMovimiento.INGRESO);
        compraId.setFecha(Instant.now().minusSeconds(3600));
        movCompra.setMovimientoPuntosCompraId(compraId);
        movCompra.setMonto(200L);
        when(movimientoPuntosCompraRepository.findByMovimientoPuntosCompraId_UsuarioId(userId))
                .thenReturn(List.of(movCompra));

        MovimientoPuntosIntercambio movInter = new MovimientoPuntosIntercambio();
        MovimientoPuntosIntercambioId interId = new MovimientoPuntosIntercambioId();
        interId.setUsuarioId(userId);
        interId.setTipoMovimiento(TipoMovimiento.EGRESO);
        interId.setFecha(Instant.now().minusSeconds(1800));
        movInter.setMovimientoPuntosIntercambioId(interId);
        movInter.setMonto(100L);
        when(movimientoPuntosIntercambioRepository.findByMovimientoPuntosIntercambioId_UsuarioId(userId))
                .thenReturn(List.of(movInter));

        MovimientoPuntosResenia movResenia = new MovimientoPuntosResenia();
        MovimientoPuntosReseniaId reseniaId = new MovimientoPuntosReseniaId(null, userId, TipoMovimiento.INGRESO);
        movResenia.setMovimientoPuntosReseniaId(reseniaId);
        movResenia.setMonto(50L);
        when(movimientoPuntosReseniaRepository.findByUsuario_Id(userId))
                .thenReturn(List.of(movResenia));

        List<MovimientoPuntosResponseDTO> historial = movimientoPuntosService.obtenerHistorial();

        assertEquals(4, historial.size());
        for (MovimientoPuntosResponseDTO dto : historial) {
            assertNotNull(dto.fecha(), "La fecha del movimiento " + dto.origen() + " no debe ser nula");
        }
    }

    @Test
    void notificacionArchivarMarcaTrueYContarNoLeidasExcluyeArchivadas() {
        UUID userId = UUID.randomUUID();
        UUID notifId = UUID.randomUUID();
        Usuario usuario = new Usuario();
        usuario.setId(userId);
        usuario.setEmail("ana@example.com");

        Notificacion notificacion = new Notificacion();
        notificacion.setId(notifId);
        notificacion.setUsuario(usuario);
        notificacion.setArchivada(false);

        when(usuarioRepository.findById(userId)).thenReturn(Optional.of(usuario));
        when(notificacionRepository.findById(notifId)).thenReturn(Optional.of(notificacion));
        when(notificacionRepository.countByUsuarioEmailAndLeidaFalseAndArchivadaFalse("ana@example.com"))
                .thenReturn(3L);

        notificacionService.archivar(notifId, userId);
        assertTrue(notificacion.getArchivada());

        long noLeidas = notificacionService.contarNoLeidas(userId);
        assertEquals(3L, noLeidas);
        verify(notificacionRepository).countByUsuarioEmailAndLeidaFalseAndArchivadaFalse("ana@example.com");
    }

    @Test
    void reseniaListarTodasYPorUsuarioYCrerDisparaNotificaciones() {
        UUID userId = UUID.randomUUID();
        Usuario reviewer = new Usuario();
        reviewer.setId(userId);
        reviewer.setEmail("solicitante@example.com");
        reviewer.setSaldoTotal(500);

        Usuario evaluado = new Usuario();
        evaluado.setEmail("receptor@example.com");

        IntercambioId interId = new IntercambioId(
                "978-1", "solicitante@example.com", LocalDateTime.now().minusDays(2),
                "978-2", "receptor@example.com", LocalDateTime.now().minusDays(2)
        );
        Intercambio intercambio = new Intercambio();
        intercambio.setId(interId);
        intercambio.setEstado(EstadoIntercambio.COMPLETADO);

        when(usuarioRepository.findById(userId)).thenReturn(Optional.of(reviewer));
        when(usuarioRepository.findByEmail("solicitante@example.com")).thenReturn(Optional.of(reviewer));
        when(usuarioRepository.findByEmail("receptor@example.com")).thenReturn(Optional.of(evaluado));
        when(intercambioRepository.findById(interId)).thenReturn(Optional.of(intercambio));
        when(reseniaRepository.existsById(any(ReseniaId.class))).thenReturn(false);
        when(reseniaRepository.calcularPromedioRecibido("receptor@example.com")).thenReturn(5.0);

        ReseniaResponseDTO expectedDto = new ReseniaResponseDTO(
                interId, true, "solicitante@example.com", "receptor@example.com", (short) 5, "Excelente"
        );
        when(reseniaMapper.toDTO(any(Resenia.class))).thenReturn(expectedDto);

        ReseniaRequestDTO req = new ReseniaRequestDTO(interId, (short) 5, "Excelente");
        ReseniaResponseDTO creada = reseniaService.crearResenia(req, userId);

        assertEquals((short) 5, creada.calificacion());
        verify(notificacionServiceMock).crear("receptor@example.com", TipoNotificacion.RESENIA_RECIBIDA);
        verify(notificacionServiceMock).crear("solicitante@example.com", TipoNotificacion.PUNTOS_GANADOS);

        Resenia r = new Resenia();
        when(reseniaRepository.findAll()).thenReturn(List.of(r));
        when(reseniaRepository.listarRecibidasPorEmail("receptor@example.com")).thenReturn(List.of(r));

        assertEquals(1, reseniaService.listarTodas().size());
        assertEquals(1, reseniaService.listarPorUsuario("receptor@example.com").size());
    }

    @Test
    void usuarioActualizarPerfilPropioCambiaNombreYDejarDeSeguirRemueveLibro() {
        UUID userId = UUID.randomUUID();
        Usuario usuario = new Usuario();
        usuario.setId(userId);
        usuario.setNombre("NombreViejo");
        usuario.setEmail("user@example.com");

        Libro libro = new Libro();
        libro.setIsbn("978-84-376-0457-2");
        usuario.setLibrosSeguidos(new HashSet<>(Set.of(libro)));

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("NombreViejo", "pass")
        );
        when(usuarioRepository.findByNombre("NombreViejo")).thenReturn(Optional.of(usuario));
        when(usuarioMapper.toPerfilDTO(usuario)).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            return new PerfilResponseDTO(u.getId(), u.getNombre(), u.getEmail(), "USUARIO", 500, 0, 500, 5.0f);
        });

        PerfilResponseDTO actualizado = usuarioService.actualizarPerfilPropio("NombreNuevo");
        assertEquals("NombreNuevo", usuario.getNombre());
        assertEquals("NombreNuevo", actualizado.nombre());
        verify(usuarioRepository).save(usuario);

        when(usuarioRepository.findById(userId)).thenReturn(Optional.of(usuario));
        usuarioService.dejarDeSeguirLibro(userId, "978-84-376-0457-2");
        assertTrue(usuario.getLibrosSeguidos().isEmpty());
    }

    @Test
    void cadenaIntercambioCrearAceptarYRechazarCambianEstadosCorrectamente() {
        UUID userId = UUID.randomUUID();
        Usuario participante = new Usuario();
        participante.setId(userId);
        participante.setEmail("p1@example.com");

        when(usuarioRepository.findByEmail("p1@example.com")).thenReturn(Optional.of(participante));
        when(cadenaIntercambioRepository.save(any(CadenaIntercambio.class))).thenAnswer(inv -> {
            CadenaIntercambio c = inv.getArgument(0);
            if (c.getId() == null) {
                c.setId(UUID.randomUUID());
            }
            return c;
        });

        CadenaIntercambioRequestDTO req = new CadenaIntercambioRequestDTO(List.of("p1@example.com"), 75);
        CadenaIntercambioResponseDTO creada = cadenaIntercambioService.crearCadena(req);

        assertEquals(EstadoCadena.PROPUESTA, creada.estado());
        assertEquals(75, creada.puntosBonus());
        assertEquals(List.of("p1@example.com"), creada.participantesEmails());

        CadenaIntercambio entidad = new CadenaIntercambio();
        entidad.setId(creada.id());
        entidad.setPuntosBonus(75);
        entidad.setEstado(EstadoCadena.PROPUESTA);
        entidad.setParticipantes(Set.of(participante));
        when(cadenaIntercambioRepository.findById(creada.id())).thenReturn(Optional.of(entidad));

        CadenaIntercambioResponseDTO enCurso = cadenaIntercambioService.aceptarCadena(creada.id(), userId);
        assertEquals(EstadoCadena.EN_CURSO, enCurso.estado());

        CadenaIntercambioResponseDTO rechazada = cadenaIntercambioService.rechazarCadena(creada.id(), userId);
        assertEquals(EstadoCadena.CANCELADA, rechazada.estado());
    }
}
