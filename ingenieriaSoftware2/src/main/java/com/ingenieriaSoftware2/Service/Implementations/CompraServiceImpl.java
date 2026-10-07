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
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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
    private IntercambioService intercambioService;

    @Autowired
    private CompraMapper compraMapper;

    @Override
    @Transactional
    public CompraResponseDTO realizarCompra(CompraRequestDTO request, UUID compradorId) {
        Usuario comprador = buscarUsuario(compradorId);
        String emailComprador = comprador.getEmail();

        if (emailComprador.equals(request.emailPropietario())) {
            throw new AccionNoPermitidaException("No podés comprar tu propia publicación");
        }

        Publicacion publicacion = publicacionRepository.findById(
                        new PublicacionId(request.isbn(), request.emailPropietario(), request.horaPublicacion()))
                .orElseThrow(() -> new PublicacionNoExisteException());
        validarPublicacionDisponible(publicacion);

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

        Compra compra = compraRepository.findByIdParaActualizar(id).orElse(null);

        if (compra != null) {
            // Una compra cancelada se reutiliza; los movimientos anteriores quedan en el historial
            if (compra.getEstado() != EstadoCompra.CANCELADA) {
                throw new EstadoCompraInvalidoException("Ya tenés una compra en curso para esta publicación");
            }
            compra.setMotivoCancelacion(null);
            compra.setInfoEnvio(null);
        } else {
            compra = new Compra();
            compra.setId(id);
        }

        compra.setLibro(publicacion.getLibro());
        compra.setPuntos(precio);
        compra.setEstado(EstadoCompra.PENDIENTE_PAGO);
        compra.setTimestamp(Instant.now());

        return compraMapper.toDTO(compraRepository.save(compra));
    }

    @Override
    @Transactional
    public CompraResponseDTO obtenerPorId(CompraId compraId) {
        Compra compra = compraRepository.findById(compraId)
                .orElseThrow(() -> new CompraNoEncontradaException());
        return compraMapper.toDTO(compra);
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
        Compra compra = bloquearCompra(compraId);
        Usuario comprador = bloquearUsuario(compradorId);
        validarEsComprador(compra, comprador);
        validarEstado(compra, EstadoCompra.PENDIENTE_PAGO);

        // Con el bloqueo, si otro comprador pagó al mismo tiempo, acá ya se ve RESERVADA
        Publicacion publicacion = bloquearPublicacion(compra);
        validarPublicacionDisponible(publicacion);

        reservarPuntos(comprador, compra);

        publicacion.setEstadoPublicacion(EstadoPublicacion.RESERVADA);

        // Lo que estaba pendiente sobre esta publicación ya no se puede concretar
        intercambioService.cancelarPendientesDePublicacion(publicacion.getId(), null);
        cancelarOtrasComprasPendientes(publicacion, compra.getId());

        compra.setEstado(EstadoCompra.PAGADA);
        return compraMapper.toDTO(compra);
    }

    @Override
    @Transactional
    public CompraResponseDTO marcarComoEnviada(CompraId compraId, UUID vendedorId, String infoEnvio) {
        Compra compra = bloquearCompra(compraId);
        validarEsVendedor(compra, buscarUsuario(vendedorId));
        validarEstado(compra, EstadoCompra.PAGADA);

        compra.setEstado(EstadoCompra.ENVIADA);
        compra.setInfoEnvio(infoEnvio);
        return compraMapper.toDTO(compra);
    }

    @Override
    @Transactional
    public CompraResponseDTO marcarComoEntregada(CompraId compraId, UUID compradorId) {
        Compra compra = bloquearCompra(compraId);
        Usuario comprador = bloquearUsuario(compradorId);
        validarEsComprador(compra, comprador);
        validarEstado(compra, EstadoCompra.ENVIADA);

        Usuario vendedor = bloquearPorEmail(compra.getId().getPropietarioEmail());
        transferirPuntos(comprador, vendedor, compra);

        bloquearPublicacion(compra).setEstadoPublicacion(EstadoPublicacion.VENDIDA);
        compra.setEstado(EstadoCompra.ENTREGADA);
        return compraMapper.toDTO(compra);
    }

    @Override
    @Transactional
    public CompraResponseDTO cancelarCompra(CompraId compraId, UUID usuarioId, String motivo) {
        Compra compra = bloquearCompra(compraId);
        validarEsParticipante(compra, buscarUsuario(usuarioId));
        validarEstado(compra, EstadoCompra.PENDIENTE_PAGO, EstadoCompra.PAGADA);

        // Solo hay puntos reservados y publicación bloqueada si ya se había pagado
        if (compra.getEstado() == EstadoCompra.PAGADA) {
            Usuario comprador = bloquearPorEmail(compra.getId().getCompradorEmail());
            liberarPuntos(comprador, compra);
            bloquearPublicacion(compra).setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);
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
        // Protección por si una compra quedó PAGADA sin reserva activa
        if (!tieneReservaActiva(compra, comprador)) return;

        int monto = compra.getPuntos();
        comprador.setSaldoReservado(saldoReservado(comprador) - monto);
        registrarMovimiento(compra, comprador, TipoMovimiento.LIBERACION_RESERVA, monto);
    }

    private void transferirPuntos(Usuario comprador, Usuario vendedor, Compra compra) {
        int monto = compra.getPuntos();

        comprador.setSaldoReservado(saldoReservado(comprador) - monto);
        comprador.setSaldoTotal(saldoTotal(comprador) - monto);
        registrarMovimiento(compra, comprador, TipoMovimiento.EGRESO, monto);

        vendedor.setSaldoTotal(saldoTotal(vendedor) + monto);
        registrarMovimiento(compra, vendedor, TipoMovimiento.INGRESO, monto);
    }

    /** Una reserva está activa si todavía no se cerró con una liberación o un pago. */
    private boolean tieneReservaActiva(Compra compra, Usuario usuario) {
        CompraId id = compra.getId();
        long reservas = movimientoRepository.contarMovimientos(id, usuario.getId(), TipoMovimiento.RESERVA);
        long cerradas = movimientoRepository.contarMovimientos(id, usuario.getId(), TipoMovimiento.LIBERACION_RESERVA)
                + movimientoRepository.contarMovimientos(id, usuario.getId(), TipoMovimiento.EGRESO);
        return reservas > cerradas;
    }

    private void registrarMovimiento(Compra compra, Usuario usuario, TipoMovimiento tipo, int monto) {
        MovimientoPuntosCompra movimiento = new MovimientoPuntosCompra();
        movimiento.setMovimientoPuntosCompraId(new MovimientoPuntosCompraId(
                compra.getId(), usuario.getId(), tipo, Instant.now().truncatedTo(ChronoUnit.MICROS)));
        movimiento.setCompra(compra);
        movimiento.setUsuario(usuario);
        movimiento.setMonto((long) monto);
        movimientoRepository.save(movimiento);
    }

    private int saldoDisponible(Usuario usuario) {
        return saldoTotal(usuario) - saldoReservado(usuario);
    }

    private int saldoTotal(Usuario usuario) {
        return usuario.getSaldoTotal() != null ? usuario.getSaldoTotal() : 0;
    }

    private int saldoReservado(Usuario usuario) {
        return usuario.getSaldoReservado() != null ? usuario.getSaldoReservado() : 0;
    }

    // ---------- Compras pendientes ----------

    private void cancelarOtrasComprasPendientes(Publicacion publicacion, CompraId excluir) {
        PublicacionId pid = publicacion.getId();
        compraRepository.buscarPorPublicacionYEstado(
                        pid.getIsbn(), pid.getEmailPropietario(), pid.getHoraPublicacion(),
                        EstadoCompra.PENDIENTE_PAGO)
                .stream()
                .filter(otra -> !otra.getId().equals(excluir))
                .forEach(otra -> {
                    otra.setEstado(EstadoCompra.CANCELADA);
                    otra.setMotivoCancelacion("La publicación ya no está disponible");
                });
    }

    // ---------- Validaciones de participantes ----------

    private void validarEsComprador(Compra compra, Usuario usuario) {
        if (!compra.getId().getCompradorEmail().equals(usuario.getEmail())) {
            throw new AccionNoPermitidaException("Solo el comprador puede realizar esta acción");
        }
    }

    private void validarEsVendedor(Compra compra, Usuario usuario) {
        if (!compra.getId().getPropietarioEmail().equals(usuario.getEmail())) {
            throw new AccionNoPermitidaException("Solo el vendedor puede realizar esta acción");
        }
    }

    private void validarEsParticipante(Compra compra, Usuario usuario) {
        boolean esComprador = compra.getId().getCompradorEmail().equals(usuario.getEmail());
        boolean esVendedor = compra.getId().getPropietarioEmail().equals(usuario.getEmail());
        if (!esComprador && !esVendedor) {
            throw new AccionNoPermitidaException("No participás en esta compra");
        }
    }

    // ---------- Búsquedas (las "bloquear" toman lock de escritura) ----------

    private Compra bloquearCompra(CompraId id) {
        return compraRepository.findByIdParaActualizar(id)
                .orElseThrow(() -> new CompraNoEncontradaException());
    }

    private Publicacion bloquearPublicacion(Compra compra) {
        CompraId id = compra.getId();
        PublicacionId pid = new PublicacionId(id.getIsbn(), id.getPropietarioEmail(), id.getHoraPublicacion());
        return publicacionRepository.findByIdParaActualizar(pid)
                .orElseThrow(() -> new PublicacionNoExisteException());
    }

    private Usuario buscarUsuario(UUID usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new UsuarioNoEncontrado());
    }

    private Usuario bloquearUsuario(UUID usuarioId) {
        return usuarioRepository.findByIdParaActualizar(usuarioId)
                .orElseThrow(() -> new UsuarioNoEncontrado());
    }

    private Usuario bloquearPorEmail(String email) {
        return usuarioRepository.findByEmailParaActualizar(email)
                .orElseThrow(() -> new UsuarioNoEncontrado());
    }

    private void validarPublicacionDisponible(Publicacion publicacion) {
        if (publicacion.getEstadoPublicacion() != EstadoPublicacion.DISPONIBLE) {
            throw new EstadoCompraInvalidoException("La publicación no está disponible");
        }
    }

    private void validarEstado(Compra compra, EstadoCompra... estadosPermitidos) {
        if (!Arrays.asList(estadosPermitidos).contains(compra.getEstado())) {
            throw new EstadoCompraInvalidoException(
                    "No se puede realizar esta acción con la compra en estado " + compra.getEstado());
        }
    }
}