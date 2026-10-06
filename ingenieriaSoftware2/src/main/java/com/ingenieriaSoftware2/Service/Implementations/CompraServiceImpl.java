package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.CompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CompraResponseDTO;
import com.ingenieriaSoftware2.Entity.Compra;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosCompraId;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosCompra;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCompra;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Enums.TipoMovimiento;
import com.ingenieriaSoftware2.Exception.Compra.CompraNoEncontradaException;
import com.ingenieriaSoftware2.Exception.Compra.EstadoCompraInvalidoException;
import com.ingenieriaSoftware2.Exception.Intercambio.AccionNoPermitidaException;
import com.ingenieriaSoftware2.Exception.Intercambio.PuntosInsuficientesException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoExisteException;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.CompraMapper;
import com.ingenieriaSoftware2.Repository.CompraRepository;
import com.ingenieriaSoftware2.Repository.MovimientoPuntosCompraRepository;
import com.ingenieriaSoftware2.Repository.PublicacionRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.CompraService;
import com.ingenieriaSoftware2.Service.Interfaces.IntercambioService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class CompraServiceImpl implements CompraService {

    @Autowired
    private CompraRepository compraRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private MovimientoPuntosCompraRepository movimientoRepository;

    @Autowired
    private CompraMapper compraMapper;

    @Autowired
    private IntercambioService intercambioService;

    @Override
    @Transactional
    public CompraResponseDTO realizarCompra(CompraRequestDTO request, UUID compradorId) {
        Usuario comprador = buscarUsuario(compradorId);
        String emailComprador = comprador.getEmail();

        if (emailComprador.equals(request.emailPropietario())) {
            throw new AccionNoPermitidaException("No podés comprar tu propia publicación");
        }

        PublicacionId publicacionId = new PublicacionId(
                request.isbn(), request.emailPropietario(), request.horaPublicacion());
        Publicacion publicacion = publicacionRepository.findById(publicacionId)
                .orElseThrow(() -> new PublicacionNoExisteException());

        if (publicacion.getEstadoPublicacion() != EstadoPublicacion.DISPONIBLE) {
            throw new EstadoCompraInvalidoException("La publicación no está disponible");
        }

        Integer precio = publicacion.getValorPuntosSolicitado();
        if (precio == null || precio <= 0) {
            throw new EstadoCompraInvalidoException("La publicación no tiene un precio válido");
        }

        // Aviso temprano: el chequeo definitivo se hace al confirmar el pago
        int disponible = saldoDisponible(comprador);
        if (disponible < precio) {
            throw new PuntosInsuficientesException(precio, disponible);
        }

        CompraId id = new CompraId(
                emailComprador, request.isbn(), request.emailPropietario(), request.horaPublicacion());

        if (compraRepository.existsById(id)) {
            throw new EstadoCompraInvalidoException("Ya tenés una compra registrada para esta publicación");
        }

        Compra compra = new Compra();
        compra.setId(id);
        compra.setLibro(publicacion.getLibro());
        compra.setPuntos(precio);
        compra.setEstado(EstadoCompra.PENDIENTE_PAGO);
        compra.setTimestamp(Instant.now());

        return compraMapper.toDTO(compraRepository.save(compra));
    }

    @Override
    @Transactional
    public CompraResponseDTO obtenerPorId(CompraId compraId) {
        return compraMapper.toDTO(buscarCompra(compraId));
    }

    @Override
    @Transactional
    public List<CompraResponseDTO> listarPorComprador(UUID compradorId) {
        return compraRepository.findById_CompradorEmail(buscarUsuario(compradorId).getEmail()).stream()
                .map(compraMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional
    public List<CompraResponseDTO> listarPorVendedor(UUID vendedorId) {
        return compraRepository.findById_PropietarioEmail(buscarUsuario(vendedorId).getEmail()).stream()
                .map(compraMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional
    public CompraResponseDTO confirmarPago(CompraId compraId, UUID compradorId) {
        Compra compra = buscarCompra(compraId);
        Usuario comprador = validarEsComprador(compra, compradorId);
        validarEstado(compra, EstadoCompra.PENDIENTE_PAGO);

        // Si otro comprador ya pagó esta publicación, deja de estar disponible
        Publicacion publicacion = buscarPublicacion(compra);
        validarPublicacionDisponible(publicacion);

        reservarPuntos(comprador, compra);

        publicacion.setEstadoPublicacion(EstadoPublicacion.RESERVADA);
        // Las propuestas de intercambio pendientes sobre esta publicación ya no se pueden concretar
        intercambioService.cancelarPendientesDePublicacion(publicacion.getId(), null);

        compra.setEstado(EstadoCompra.PAGADA);
        return compraMapper.toDTO(compra);
    }

    @Override
    @Transactional
    public CompraResponseDTO marcarComoEnviada(CompraId compraId, String infoEnvio) {
        Compra compra = buscarCompra(compraId);
        validarEstado(compra, EstadoCompra.PAGADA);

        compra.setEstado(EstadoCompra.ENVIADA);
        compra.setInfoEnvio(infoEnvio);
        return compraMapper.toDTO(compra);
    }

    @Override
    @Transactional
    public CompraResponseDTO marcarComoEntregada(CompraId compraId) {
        Compra compra = buscarCompra(compraId);
        validarEstado(compra, EstadoCompra.ENVIADA);

        Usuario comprador = buscarPorEmail(compra.getId().getCompradorEmail());
        Usuario vendedor = buscarPorEmail(compra.getId().getPropietarioEmail());
        transferirPuntos(comprador, vendedor, compra);

        compra.setEstado(EstadoCompra.ENTREGADA);
        return compraMapper.toDTO(compra);
    }

    @Override
    @Transactional
    public CompraResponseDTO cancelarCompra(CompraId compraId, String motivo) {
        Compra compra = buscarCompra(compraId);
        validarEstado(compra, EstadoCompra.PENDIENTE_PAGO, EstadoCompra.PAGADA);

        // Solo hay puntos reservados si ya se había confirmado el pago
        if (compra.getEstado() == EstadoCompra.PAGADA) {
            Usuario comprador = buscarPorEmail(compra.getId().getCompradorEmail());
            liberarPuntos(comprador, compra);
        }

        compra.setEstado(EstadoCompra.CANCELADA);
        compra.setMotivoCancelacion(motivo);
        return compraMapper.toDTO(compra);
    }

    // ---------- Puntos ----------

    private void reservarPuntos(Usuario comprador, Compra compra) {
        int monto = compra.getPuntos();
        int disponible = saldoDisponible(comprador);

        if (disponible < monto) {
            throw new PuntosInsuficientesException(monto, disponible);
        }

        comprador.setSaldoReservado(saldoReservado(comprador) + monto);
        registrarMovimiento(compra, comprador, TipoMovimiento.RESERVA, monto);
    }

    private void liberarPuntos(Usuario comprador, Compra compra) {
        MovimientoPuntosCompraId reservaId = new MovimientoPuntosCompraId(
                compra.getId(), comprador.getId(), TipoMovimiento.RESERVA);

        // Protección por si una compra quedó PAGADA sin reserva registrada
        if (!movimientoRepository.existsById(reservaId)) return;

        int monto = compra.getPuntos();
        comprador.setSaldoReservado(saldoReservado(comprador) - monto);
        registrarMovimiento(compra, comprador, TipoMovimiento.LIBERACION_RESERVA, monto);
    }

    private void transferirPuntos(Usuario comprador, Usuario vendedor, Compra compra) {
        int monto = compra.getPuntos();

        // Salen los puntos reservados del comprador
        comprador.setSaldoReservado(saldoReservado(comprador) - monto);
        comprador.setSaldoTotal(saldoTotal(comprador) - monto);
        registrarMovimiento(compra, comprador, TipoMovimiento.EGRESO, monto);

        // Entran al vendedor
        vendedor.setSaldoTotal(saldoTotal(vendedor) + monto);
        registrarMovimiento(compra, vendedor, TipoMovimiento.INGRESO, monto);
    }

    private void registrarMovimiento(Compra compra, Usuario usuario, TipoMovimiento tipo, int monto) {
        MovimientoPuntosCompra movimiento = new MovimientoPuntosCompra();
        movimiento.setMovimientoPuntosCompraId(
                new MovimientoPuntosCompraId(compra.getId(), usuario.getId(), tipo));
        movimiento.setCompra(compra);
        movimiento.setUsuario(usuario);
        movimiento.setMonto((long) monto);
        movimientoRepository.save(movimiento);
    }

    private int saldoDisponible(Usuario usuario) {
        return saldoTotal(usuario) - saldoReservado(usuario);
    }

    // Los saldos son Integer y pueden venir en null en usuarios recién creados
    private int saldoTotal(Usuario usuario) {
        return usuario.getSaldoTotal() != null ? usuario.getSaldoTotal() : 0;
    }

    private int saldoReservado(Usuario usuario) {
        return usuario.getSaldoReservado() != null ? usuario.getSaldoReservado() : 0;
    }

    // ---------- Métodos auxiliares ----------

    private Compra buscarCompra(CompraId id) {
        return compraRepository.findById(id).orElseThrow(() -> new CompraNoEncontradaException());
    }

    private Usuario buscarUsuario(UUID usuarioId) {
        return usuarioRepository.findById(usuarioId).orElseThrow(() -> new UsuarioNoEncontrado());
    }

    private Usuario buscarPorEmail(String email) {
        return usuarioRepository.findByEmail(email).orElseThrow(() -> new UsuarioNoEncontrado());
    }

    private void validarEstado(Compra compra, EstadoCompra... estadosPermitidos) {
        if (!Arrays.asList(estadosPermitidos).contains(compra.getEstado())) {
            throw new EstadoCompraInvalidoException(
                    "No se puede realizar esta acción con la compra en estado " + compra.getEstado());
        }
    }
    private Usuario validarEsComprador(Compra compra, UUID usuarioId) {
        Usuario usuario = buscarUsuario(usuarioId);
        if (!compra.getId().getCompradorEmail().equals(usuario.getEmail())) {
            throw new AccionNoPermitidaException("Solo el comprador puede realizar esta acción");
        }
        return usuario;
    }

    private Publicacion buscarPublicacion(Compra compra) {
        CompraId id = compra.getId();
        PublicacionId publicacionId = new PublicacionId(id.getIsbn(), id.getPropietarioEmail(), id.getHoraPublicacion());
        return publicacionRepository.findById(publicacionId)
                .orElseThrow(() -> new PublicacionNoExisteException());
    }

    private void validarPublicacionDisponible(Publicacion publicacion) {
        if (publicacion.getEstadoPublicacion() != EstadoPublicacion.DISPONIBLE) {
            throw new EstadoCompraInvalidoException("La publicación no está disponible");
        }
    }
}