package com.ingenieriaSoftware2.Service;

import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.CadenaIntercambio;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCadena;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Repository.CadenaIntercambioRepository;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Repository.LibroRepository;
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
    private LibroRepository libroRepository;

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
        libroA.setId(UUID.randomUUID());
        libroA.setTitulo("Libro A");
        libroA.setDisponible(true);
        libroA.setPropietario(userA);

        libroB = new Libro();
        libroB.setId(UUID.randomUUID());
        libroB.setTitulo("Libro B");
        libroB.setDisponible(true);
        libroB.setPropietario(userB);

        intercambio1 = new Intercambio();
        intercambio1.setId(UUID.randomUUID());
        intercambio1.setPrestador(userA);
        intercambio1.setReceptor(userB);
        intercambio1.setLibroOfrecido(libroA);
        intercambio1.setLibroDeseado(libroB);
        intercambio1.setEstado(EstadoIntercambio.PENDIENTE);

        intercambio2 = new Intercambio();
        intercambio2.setId(UUID.randomUUID());
        intercambio2.setPrestador(userB);
        intercambio2.setReceptor(userA);
        intercambio2.setLibroOfrecido(libroB);
        intercambio2.setLibroDeseado(libroA);
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
    @DisplayName("Confirmar paso transiciona a COMPLETADA cuando todos los participantes confirman")
    void confirmarPaso_todosConfirman_transicionaACompletadaYAcreditaBonus() {
        intercambio2.setEstado(EstadoIntercambio.ACEPTADO);

        when(cadenaIntercambioRepository.findById(cadena.getId())).thenReturn(Optional.of(cadena));
        when(cadenaIntercambioRepository.save(any(CadenaIntercambio.class))).thenAnswer(i -> i.getArgument(0));

        CadenaIntercambioResponseDTO response = cadenaIntercambioService.confirmarPaso(cadena.getId(), userA.getId());

        assertNotNull(response);
        assertEquals(EstadoCadena.COMPLETADA, response.estado());
        assertEquals(EstadoIntercambio.COMPLETADO, intercambio1.getEstado());
        assertEquals(EstadoIntercambio.COMPLETADO, intercambio2.getEstado());
        assertFalse(libroA.getDisponible());
        assertFalse(libroB.getDisponible());
        assertEquals(115, userA.getSaldoTotal());
        assertEquals(115, userB.getSaldoTotal());
    }

    @Test
    @DisplayName("Rechazar cadena transiciona a CANCELADA y asegura disponibilidad de libros")
    void rechazarCadena_cancelaCadenaYLiberaLibros() {
        when(cadenaIntercambioRepository.findById(cadena.getId())).thenReturn(Optional.of(cadena));
        when(cadenaIntercambioRepository.save(any(CadenaIntercambio.class))).thenAnswer(i -> i.getArgument(0));

        CadenaIntercambioResponseDTO response = cadenaIntercambioService.rechazarCadena(cadena.getId(), userA.getId());

        assertNotNull(response);
        assertEquals(EstadoCadena.CANCELADA, response.estado());
        assertEquals(EstadoIntercambio.RECHAZADO, intercambio1.getEstado());
        assertEquals(EstadoIntercambio.RECHAZADO, intercambio2.getEstado());
        assertTrue(libroA.getDisponible());
        assertTrue(libroB.getDisponible());
    }

    @Test
    @DisplayName("Obtener cadenas por usuario retorna lista correspondiente")
    void obtenerCadenasDeUsuario_retornaLista() {
        when(cadenaIntercambioRepository.findByParticipanteId(userA.getId())).thenReturn(List.of(cadena));

        List<CadenaIntercambioResponseDTO> result = cadenaIntercambioService.obtenerCadenasDeUsuario(userA.getId());

        assertEquals(1, result.size());
        assertEquals(cadena.getId(), result.get(0).id());
    }
}
