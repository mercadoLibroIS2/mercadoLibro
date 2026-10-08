package com.ingenieriaSoftware2.Service;

import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.CadenaIntercambio;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCadena;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Repository.CadenaIntercambioRepository;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Repository.PublicacionRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Implementations.CadenaIntercambioServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CadenaIntercambioServiceTest {

    @Mock
    private CadenaIntercambioRepository cadenaIntercambioRepository;

    @Mock
    private IntercambioRepository intercambioRepository;

    @Mock
    private PublicacionRepository publicacionRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private LibroMapper libroMapper;

    @InjectMocks
    private CadenaIntercambioServiceImpl cadenaIntercambioService;

    private Usuario userA;
    private Usuario userB;
    private Libro libroA;
    private Libro libroB;
    private Publicacion pubA;
    private Publicacion pubB;
    private Intercambio intercambio1;
    private Intercambio intercambio2;
    private CadenaIntercambio cadena;

    @BeforeEach
    void setUp() {
        userA = new Usuario();
        userA.setId(UUID.randomUUID());
        userA.setNombre("Franco");
        userA.setEmail("franco@test.com");
        userA.setSaldoTotal(100);

        userB = new Usuario();
        userB.setId(UUID.randomUUID());
        userB.setNombre("Miguel");
        userB.setEmail("miguel@test.com");
        userB.setSaldoTotal(100);

        libroA = new Libro();
        libroA.setIsbn("ISBN-A");
        libroA.setTitulo("Libro A");

        libroB = new Libro();
        libroB.setIsbn("ISBN-B");
        libroB.setTitulo("Libro B");

        pubA = new Publicacion();
        pubA.setLibro(libroA);
        pubA.setPropietario(userA);
        pubA.setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);

        pubB = new Publicacion();
        pubB.setLibro(libroB);
        pubB.setPropietario(userB);
        pubB.setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);

        intercambio1 = new Intercambio();
        intercambio1.setPublicacionOfrecida(pubA);
        intercambio1.setPublicacionSolicitante(pubB);
        intercambio1.setEstado(EstadoIntercambio.PENDIENTE);

        intercambio2 = new Intercambio();
        intercambio2.setPublicacionOfrecida(pubB);
        intercambio2.setPublicacionSolicitante(pubA);
        intercambio2.setEstado(EstadoIntercambio.PENDIENTE);

        cadena = new CadenaIntercambio();
        cadena.setId(UUID.randomUUID());
        cadena.setEstado(EstadoCadena.PROPUESTA);
        cadena.setPuntosBonus(15);
        cadena.setParticipantes(new HashSet<>(Arrays.asList(userA, userB)));
        cadena.setIntercambios(new ArrayList<>(Arrays.asList(intercambio1, intercambio2)));
    }

    @Test
    @DisplayName("Confirmar paso transiciona a EN_CURSO cuando solo un participante confirma")
    void confirmarPaso_unSoloParticipante_transicionaAEnCurso() {
        when(cadenaIntercambioRepository.findById(cadena.getId())).thenReturn(Optional.of(cadena));
        when(cadenaIntercambioRepository.save(any(CadenaIntercambio.class))).thenAnswer(i -> i.getArgument(0));

        CadenaIntercambioResponseDTO response = cadenaIntercambioService.confirmarPaso(cadena.getId(), userA.getId());

        assertNotNull(response);
        assertEquals(EstadoCadena.EN_CURSO, response.estado());
        assertEquals(EstadoIntercambio.ACEPTADO, intercambio1.getEstado());
        verify(intercambioRepository).save(intercambio1);
    }

    @Test
    @DisplayName("Confirmar paso cuando todos confirman completa la cadena y acredita bonus")
    void confirmarPaso_todosConfirman_completaCadenaYAcreditaBonus() {
        intercambio2.setEstado(EstadoIntercambio.ACEPTADO);

        when(cadenaIntercambioRepository.findById(cadena.getId())).thenReturn(Optional.of(cadena));
        when(cadenaIntercambioRepository.save(any(CadenaIntercambio.class))).thenAnswer(i -> i.getArgument(0));

        CadenaIntercambioResponseDTO response = cadenaIntercambioService.confirmarPaso(cadena.getId(), userA.getId());

        assertNotNull(response);
        assertEquals(EstadoCadena.COMPLETADA, response.estado());
        assertEquals(EstadoIntercambio.COMPLETADO, intercambio1.getEstado());
        assertEquals(EstadoIntercambio.COMPLETADO, intercambio2.getEstado());
        assertEquals(115, userA.getSaldoTotal());
        assertEquals(115, userB.getSaldoTotal());
        verify(usuarioRepository, times(2)).save(any(Usuario.class));
    }

    @Test
    @DisplayName("Rechazar cadena cancela la cadena y libera publicaciones")
    void rechazarCadena_cancelaCadenaYLiberaPublicaciones() {
        when(cadenaIntercambioRepository.findById(cadena.getId())).thenReturn(Optional.of(cadena));
        when(cadenaIntercambioRepository.save(any(CadenaIntercambio.class))).thenAnswer(i -> i.getArgument(0));

        CadenaIntercambioResponseDTO response = cadenaIntercambioService.rechazarCadena(cadena.getId(), userA.getId());

        assertNotNull(response);
        assertEquals(EstadoCadena.CANCELADA, response.estado());
        assertEquals(EstadoIntercambio.RECHAZADO, intercambio1.getEstado());
        assertEquals(EstadoIntercambio.RECHAZADO, intercambio2.getEstado());
        assertEquals(EstadoPublicacion.DISPONIBLE, pubA.getEstadoPublicacion());
        assertEquals(EstadoPublicacion.DISPONIBLE, pubB.getEstadoPublicacion());
    }
}
