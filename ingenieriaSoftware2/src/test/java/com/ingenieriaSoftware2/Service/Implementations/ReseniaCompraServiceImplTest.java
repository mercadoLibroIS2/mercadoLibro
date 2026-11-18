package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.ReseniaCompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.ReseniaCompraResponseDTO;
import com.ingenieriaSoftware2.Entity.Compra;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Entity.ReseniaCompra;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCompra;
import com.ingenieriaSoftware2.Enums.TipoNotificacion;
import com.ingenieriaSoftware2.Repository.CompraRepository;
import com.ingenieriaSoftware2.Repository.ReseniaCompraRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Implementations.Auxiliares.ReputacionCalculadora;
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
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReseniaCompraServiceImplTest {

    @Mock private ReseniaCompraRepository reseniaCompraRepository;
    @Mock private CompraRepository compraRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private ReputacionCalculadora reputacionCalculadora;
    @Mock private MovimientoPuntosService movimientoPuntosService;
    @Mock private NotificacionService notificacionService;

    @InjectMocks
    private ReseniaCompraServiceImpl service;

    private final LocalDateTime hora = LocalDateTime.of(2026, 11, 1, 10, 0);
    private final CompraId compraId = new CompraId("comprador@test.com", "9788420633114", "vendedor@test.com", hora);
    private Usuario comprador;
    private Usuario vendedor;
    private Compra compra;

    @BeforeEach
    void setUp() {
        comprador = usuario("comprador@test.com");
        vendedor = usuario("vendedor@test.com");
        compra = new Compra();
        compra.setId(compraId);
        compra.setEstado(EstadoCompra.ENTREGADA);
        when(usuarioRepository.findById(comprador.getId())).thenReturn(Optional.of(comprador));
        when(usuarioRepository.findByEmail("vendedor@test.com")).thenReturn(Optional.of(vendedor));
        when(compraRepository.findById(compraId)).thenReturn(Optional.of(compra));
        when(reseniaCompraRepository.save(any(ReseniaCompra.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private ReseniaCompraRequestDTO request(short calificacion) {
        return new ReseniaCompraRequestDTO("comprador@test.com", "9788420633114", "vendedor@test.com", hora, calificacion, " Todo perfecto ");
    }

    @Test
    void elCompradorCalificaAlVendedorYRecibeElBono() {
        ReseniaCompraResponseDTO dto = service.crear(request((short) 4), comprador.getId());

        assertTrue(dto.compradorReviewer());
        assertEquals("vendedor@test.com", dto.emailReseniado());
        assertEquals("Todo perfecto", dto.comentario());
        verify(reputacionCalculadora).recalcular(vendedor);
        verify(movimientoPuntosService).acreditarBonificacionSistema(comprador, 25, "Bonificación por reseña");
        verify(notificacionService).crear(eq("vendedor@test.com"), eq(TipoNotificacion.RESENIA_RECIBIDA), contains("4 de 5"));
    }

    @Test
    void noSePuedeReseniarUnaCompraNoEntregadaNiDosVeces() {
        compra.setEstado(EstadoCompra.ENVIADA);
        assertThrows(ResponseStatusException.class, () -> service.crear(request((short) 5), comprador.getId()));

        compra.setEstado(EstadoCompra.ENTREGADA);
        when(reseniaCompraRepository.existsById(any())).thenReturn(true);
        assertThrows(ResponseStatusException.class, () -> service.crear(request((short) 5), comprador.getId()));
        verify(reseniaCompraRepository, never()).save(any());
    }

    @Test
    void unTerceroNoPuedeReseniarLaCompra() {
        Usuario otro = usuario("otro@test.com");
        when(usuarioRepository.findById(otro.getId())).thenReturn(Optional.of(otro));
        assertThrows(ResponseStatusException.class, () -> service.crear(request((short) 3), otro.getId()));
    }

    private Usuario usuario(String email) {
        Usuario u = new Usuario();
        u.setId(UUID.randomUUID());
        u.setEmail(email);
        u.setNombre(email.substring(0, email.indexOf('@')));
        u.setSaldoTotal(500);
        return u;
    }
}
