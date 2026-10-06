package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.IntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.IntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosIntercambioId;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosIntercambio;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCompra;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Enums.TipoMovimiento;
import com.ingenieriaSoftware2.Exception.Intercambio.AccionNoPermitidaException;
import com.ingenieriaSoftware2.Exception.Intercambio.EstadoIntercambioInvalidoException;
import com.ingenieriaSoftware2.Exception.Intercambio.IntercambioNoExiste;
import com.ingenieriaSoftware2.Exception.Intercambio.PuntosInsuficientesException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoDisponibleException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoExisteException;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.IntercambioMapper;
import com.ingenieriaSoftware2.Repository.CompraRepository;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Repository.MovimientoPuntosIntercambioRepository;
import com.ingenieriaSoftware2.Repository.PublicacionRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.IntercambioService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class IntercambioServiceImpl implements IntercambioService {

    private static final int PUNTOS_BONIFICACION = 100;

    @Autowired
    private IntercambioRepository intercambioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private MovimientoPuntosIntercambioRepository movimientoRepository;

    @Autowired
    private CompraRepository compraRepository;

    @Autowired
    private IntercambioMapper intercambioMapper;

    @Override
    @Transactional
    public IntercambioResponseDTO proponerIntercambio(IntercambioRequestDTO request, UUID usuarioProponenteId) {
        Usuario proponente = bloquearUsuario(usuarioProponenteId);
        String emailProponente = proponente.getEmail();

        if (emailProponente.equals(request.emailPropietarioSolicitada())) {
            throw new AccionNoPermitidaException("No podés proponer un intercambio con tu propia publicación");
        }

        Publicacion ofrecida = bloquearPublicacion(new PublicacionId(
                request.isbnOfrecida(), emailProponente, request.horaPublicacionOfrecida()));
        Publicacion solicitada = bloquearPublicacion(new PublicacionId(
                request.isbnSolicitada(), request.emailPropietarioSolicitada(), request.horaPublicacionSolicitada()));

        validarPublicacionActiva(ofrecida);
        validarPublicacionActiva(solicitada);

        IntercambioId id = new IntercambioId(
                request.isbnSolicitada(),
                request.emailPropietarioSolicitada(),
                request.horaPublicacionSolicitada(),
                request.isbnOfrecida(),
                emailProponente,
                request.horaPublicacionOfrecida()
        );

        Intercambio intercambio = intercambioRepository.findByIdParaActualizar(id).orElse(null);

        if (intercambio != null) {
            // Uno rechazado o cancelado se reutiliza; los movimientos anteriores quedan en el historial
            boolean terminado = intercambio.getEstado() == EstadoIntercambio.RECHAZADO
                    || intercambio.getEstado() == EstadoIntercambio.CANCELADO;
            if (!terminado) {
                throw new EstadoIntercambioInvalidoException("Ya existe un intercambio en curso entre estas publicaciones");
            }
            intercambio.setMotivoRechazo(null);
        } else {
            intercambio = new Intercambio();
            intercambio.setId(id);
        }

        // Positiva: el proponente ofrece el libro de menor valor y debe la diferencia
        int diferencia = calcularDiferencia(ofrecida, solicitada);

        intercambio.setPublicacionOfrecida(ofrecida);
        intercambio.setPublicacionSolicitante(solicitada);
        intercambio.setEstado(EstadoIntercambio.PENDIENTE);
        intercambio.setPuntosComprometidos(Math.abs(diferencia));

        Intercambio guardado = intercambioRepository.save(intercambio);

        // El proponente reserva SOLO si es el deudor; eso es lo que después permite saber quién debe
        if (diferencia > 0) {
            reservarPuntos(proponente, guardado);
        }

        return intercambioMapper.toDTO(guardado);
    }

    @Override
    @Transactional
    public IntercambioResponseDTO obtenerPorId(IntercambioId intercambioId) {
        Intercambio intercambio = intercambioRepository.findById(intercambioId)
                .orElseThrow(() -> new IntercambioNoExiste());
        return intercambioMapper.toDTO(intercambio);
    }

    @Override
    @Transactional
    public List<IntercambioResponseDTO> listarPropuestasEnviadas(UUID usuarioId) {
        String email = buscarUsuario(usuarioId).getEmail();
        return intercambioRepository.findById_PropietarioIdOfrecida(email).stream()
                .map(intercambioMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional
    public List<IntercambioResponseDTO> listarPropuestasRecibidas(UUID usuarioId) {
        String email = buscarUsuario(usuarioId).getEmail();
        return intercambioRepository.findById_PropietarioIdSolicitante(email).stream()
                .map(intercambioMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional
    public IntercambioResponseDTO aceptarIntercambio(IntercambioId intercambioId, UUID usuarioReceptorId) {
        Intercambio intercambio = bloquearIntercambio(intercambioId);
        Usuario receptor = bloquearUsuario(usuarioReceptorId);
        validarEsReceptor(intercambio, receptor);
        validarEstado(intercambio, EstadoIntercambio.PENDIENTE);

        // Con el bloqueo, si se vendió o aceptó en paralelo, acá ya se ve RESERVADA
        Publicacion ofrecida = bloquearPublicacion(idPublicacionOfrecida(intercambio));
        Publicacion solicitada = bloquearPublicacion(idPublicacionSolicitada(intercambio));
        validarPublicacionActiva(ofrecida);
        validarPublicacionActiva(solicitada);

        // Si hay compensación y el proponente no reservó, el deudor es el receptor
        if (intercambio.getPuntosComprometidos() > 0) {
            Usuario proponente = bloquearPorEmail(intercambio.getId().getPropietarioIdOfrecida());
            if (!tieneReservaActiva(intercambio, proponente)) {
                reservarPuntos(receptor, intercambio);
            }
        }

        ofrecida.setEstadoPublicacion(EstadoPublicacion.RESERVADA);
        solicitada.setEstadoPublicacion(EstadoPublicacion.RESERVADA);
        intercambio.setEstado(EstadoIntercambio.ACEPTADO);

        // Lo que estaba pendiente sobre estas publicaciones ya no se puede concretar
        cancelarPendientesDePublicacion(ofrecida.getId(), intercambio.getId());
        cancelarPendientesDePublicacion(solicitada.getId(), intercambio.getId());
        cancelarComprasPendientes(ofrecida);
        cancelarComprasPendientes(solicitada);

        return intercambioMapper.toDTO(intercambio);
    }

    @Override
    @Transactional
    public IntercambioResponseDTO rechazarIntercambio(IntercambioId intercambioId, UUID usuarioReceptorId, String motivo) {
        Intercambio intercambio = bloquearIntercambio(intercambioId);
        validarEsReceptor(intercambio, buscarUsuario(usuarioReceptorId));
        validarEstado(intercambio, EstadoIntercambio.PENDIENTE);

        liberarReservaSiExiste(intercambio);

        intercambio.setEstado(EstadoIntercambio.RECHAZADO);
        intercambio.setMotivoRechazo(motivo);
        return intercambioMapper.toDTO(intercambio);
    }

    @Override
    @Transactional
    public IntercambioResponseDTO cancelarIntercambio(IntercambioId intercambioId, UUID usuarioId) {
        Intercambio intercambio = bloquearIntercambio(intercambioId);
        validarEsParticipante(intercambio, buscarUsuario(usuarioId));
        validarEstado(intercambio,
                EstadoIntercambio.PENDIENTE,
                EstadoIntercambio.ACEPTADO,
                EstadoIntercambio.CONFIRMADO_POR_PROPONENTE,
                EstadoIntercambio.CONFIRMADO_POR_RECEPTOR);

        liberarReservaSiExiste(intercambio);

        // Las publicaciones están reservadas desde que se aceptó
        if (intercambio.getEstado() != EstadoIntercambio.PENDIENTE) {
            bloquearPublicacion(idPublicacionOfrecida(intercambio)).setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);
            bloquearPublicacion(idPublicacionSolicitada(intercambio)).setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);
        }

        intercambio.setEstado(EstadoIntercambio.CANCELADO);
        return intercambioMapper.toDTO(intercambio);
    }

    @Override
    @Transactional
    public IntercambioResponseDTO completarIntercambio(IntercambioId intercambioId, UUID usuarioId) {
        Intercambio intercambio = bloquearIntercambio(intercambioId);
        Usuario usuario = buscarUsuario(usuarioId);
        validarEsParticipante(intercambio, usuario);
        validarEstado(intercambio,
                EstadoIntercambio.ACEPTADO,
                EstadoIntercambio.CONFIRMADO_POR_PROPONENTE,
                EstadoIntercambio.CONFIRMADO_POR_RECEPTOR);

        boolean esProponente = intercambio.getId().getPropietarioIdOfrecida().equals(usuario.getEmail());
        EstadoIntercambio estado = intercambio.getEstado();

        // Primera confirmación: se registra y se espera a la otra parte
        if (estado == EstadoIntercambio.ACEPTADO) {
            intercambio.setEstado(esProponente
                    ? EstadoIntercambio.CONFIRMADO_POR_PROPONENTE
                    : EstadoIntercambio.CONFIRMADO_POR_RECEPTOR);
            return intercambioMapper.toDTO(intercambio);
        }

        boolean yaConfirmo = (estado == EstadoIntercambio.CONFIRMADO_POR_PROPONENTE && esProponente)
                || (estado == EstadoIntercambio.CONFIRMADO_POR_RECEPTOR && !esProponente);
        if (yaConfirmo) {
            throw new EstadoIntercambioInvalidoException("Ya confirmaste; falta la confirmación de la otra parte");
        }

        // Segunda confirmación: se cierra el intercambio
        Usuario proponente = bloquearPorEmail(intercambio.getId().getPropietarioIdOfrecida());
        Usuario receptor = bloquearPorEmail(intercambio.getId().getPropietarioIdSolicitante());

        pagarCompensacion(intercambio, proponente, receptor);
        bonificar(proponente, intercambio);
        bonificar(receptor, intercambio);

        bloquearPublicacion(idPublicacionOfrecida(intercambio)).setEstadoPublicacion(EstadoPublicacion.VENDIDA);
        bloquearPublicacion(idPublicacionSolicitada(intercambio)).setEstadoPublicacion(EstadoPublicacion.VENDIDA);
        intercambio.setEstado(EstadoIntercambio.COMPLETADO);
        return intercambioMapper.toDTO(intercambio);
    }

    @Override
    @Transactional
    public EstadoIntercambio consultarEstado(IntercambioId intercambioId) {
        return intercambioRepository.findById(intercambioId)
                .orElseThrow(() -> new IntercambioNoExiste())
                .getEstado();
    }

    @Override
    @Transactional
    public void cancelarPendientesDePublicacion(PublicacionId publicacionId, IntercambioId excluir) {
        List<Intercambio> pendientes = intercambioRepository.buscarPorPublicacionYEstado(
                publicacionId.getIsbn(),
                publicacionId.getEmailPropietario(),
                publicacionId.getHoraPublicacion(),
                EstadoIntercambio.PENDIENTE);

        for (Intercambio otro : pendientes) {
            if (otro.getId().equals(excluir)) continue;

            liberarReservaSiExiste(otro);
            otro.setEstado(EstadoIntercambio.CANCELADO);
            otro.setMotivoRechazo("La publicación ya no está disponible");
        }
    }

    // ---------- Puntos ----------

    /**
     * Valor de la solicitada menos el de la ofrecida. Se usa SOLO al proponer:
     * después, el deudor se deduce de las reservas registradas.
     */
    private int calcularDiferencia(Publicacion ofrecida, Publicacion solicitada) {
        Integer valorOfrecida = ofrecida.getValorReferenciaCalculado();
        Integer valorSolicitada = solicitada.getValorReferenciaCalculado();

        if (valorOfrecida == null || valorSolicitada == null) {
            throw new EstadoIntercambioInvalidoException(
                    "No se pudo calcular el valor de referencia de alguna de las publicaciones");
        }
        return valorSolicitada - valorOfrecida;
    }

    /** Una reserva está activa si todavía no se cerró con una liberación o un pago. */
    private boolean tieneReservaActiva(Intercambio intercambio, Usuario usuario) {
        IntercambioId id = intercambio.getId();
        long reservas = movimientoRepository.contarMovimientos(id, usuario.getId(), TipoMovimiento.RESERVA);
        long cerradas = movimientoRepository.contarMovimientos(id, usuario.getId(), TipoMovimiento.LIBERACION_RESERVA)
                + movimientoRepository.contarMovimientos(id, usuario.getId(), TipoMovimiento.EGRESO);
        return reservas > cerradas;
    }

    private void reservarPuntos(Usuario deudor, Intercambio intercambio) {
        int monto = intercambio.getPuntosComprometidos();
        int disponible = saldoTotal(deudor) - saldoReservado(deudor);

        if (disponible < monto) {
            throw new PuntosInsuficientesException(monto, disponible);
        }

        deudor.setSaldoReservado(saldoReservado(deudor) + monto);
        registrarMovimiento(intercambio, deudor, TipoMovimiento.RESERVA, monto);
    }

    private void liberarReservaSiExiste(Intercambio intercambio) {
        if (intercambio.getPuntosComprometidos() == 0) return;

        Usuario proponente = bloquearPorEmail(intercambio.getId().getPropietarioIdOfrecida());
        Usuario receptor = bloquearPorEmail(intercambio.getId().getPropietarioIdSolicitante());

        Usuario conReserva = tieneReservaActiva(intercambio, proponente) ? proponente
                : tieneReservaActiva(intercambio, receptor) ? receptor
                : null;

        // Si el deudor es el receptor y todavía no había aceptado, no hay nada reservado
        if (conReserva == null) return;

        int monto = intercambio.getPuntosComprometidos();
        conReserva.setSaldoReservado(saldoReservado(conReserva) - monto);
        registrarMovimiento(intercambio, conReserva, TipoMovimiento.LIBERACION_RESERVA, monto);
    }

    private void pagarCompensacion(Intercambio intercambio, Usuario proponente, Usuario receptor) {
        int monto = intercambio.getPuntosComprometidos();
        if (monto == 0) return;

        Usuario deudor = tieneReservaActiva(intercambio, proponente) ? proponente
                : tieneReservaActiva(intercambio, receptor) ? receptor
                : null;

        if (deudor == null) {
            throw new EstadoIntercambioInvalidoException("No hay puntos reservados para la compensación");
        }

        Usuario acreedor = deudor.getId().equals(proponente.getId()) ? receptor : proponente;

        deudor.setSaldoReservado(saldoReservado(deudor) - monto);
        deudor.setSaldoTotal(saldoTotal(deudor) - monto);
        registrarMovimiento(intercambio, deudor, TipoMovimiento.EGRESO, monto);

        acreedor.setSaldoTotal(saldoTotal(acreedor) + monto);
        registrarMovimiento(intercambio, acreedor, TipoMovimiento.INGRESO, monto);
    }

    private void bonificar(Usuario usuario, Intercambio intercambio) {
        usuario.setSaldoTotal(saldoTotal(usuario) + PUNTOS_BONIFICACION);
        registrarMovimiento(intercambio, usuario, TipoMovimiento.BONIFICACION, PUNTOS_BONIFICACION);
    }

    private void registrarMovimiento(Intercambio intercambio, Usuario usuario, TipoMovimiento tipo, int monto) {
        MovimientoPuntosIntercambio movimiento = new MovimientoPuntosIntercambio();
        movimiento.setMovimientoPuntosIntercambioId(new MovimientoPuntosIntercambioId(
                intercambio.getId(), usuario.getId(), tipo, Instant.now().truncatedTo(ChronoUnit.MICROS)));
        movimiento.setIntercambio(intercambio);
        movimiento.setUsuario(usuario);
        movimiento.setMonto((long) monto);
        movimientoRepository.save(movimiento);
    }

    private int saldoTotal(Usuario usuario) {
        return usuario.getSaldoTotal() != null ? usuario.getSaldoTotal() : 0;
    }

    private int saldoReservado(Usuario usuario) {
        return usuario.getSaldoReservado() != null ? usuario.getSaldoReservado() : 0;
    }

    // ---------- Compras pendientes ----------

    private void cancelarComprasPendientes(Publicacion publicacion) {
        PublicacionId pid = publicacion.getId();
        compraRepository.buscarPorPublicacionYEstado(
                        pid.getIsbn(), pid.getEmailPropietario(), pid.getHoraPublicacion(),
                        EstadoCompra.PENDIENTE_PAGO)
                .forEach(compra -> {
                    compra.setEstado(EstadoCompra.CANCELADA);
                    compra.setMotivoCancelacion("La publicación ya no está disponible");
                });
    }

    // ---------- Búsquedas (las "bloquear" toman lock de escritura) ----------

    private Intercambio bloquearIntercambio(IntercambioId id) {
        return intercambioRepository.findByIdParaActualizar(id)
                .orElseThrow(() -> new IntercambioNoExiste());
    }

    private Publicacion bloquearPublicacion(PublicacionId id) {
        return publicacionRepository.findByIdParaActualizar(id)
                .orElseThrow(() -> new PublicacionNoExisteException());
    }

    private PublicacionId idPublicacionOfrecida(Intercambio intercambio) {
        IntercambioId id = intercambio.getId();
        return new PublicacionId(id.getIsbnOfrecida(), id.getPropietarioIdOfrecida(), id.getHoraDePublicacionOfrecida());
    }

    private PublicacionId idPublicacionSolicitada(Intercambio intercambio) {
        IntercambioId id = intercambio.getId();
        return new PublicacionId(id.getIsbnSolicitante(), id.getPropietarioIdSolicitante(), id.getHoraDePublicacionSolicitante());
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

    // ---------- Validaciones ----------

    private void validarPublicacionActiva(Publicacion publicacion) {
        if (publicacion.getEstadoPublicacion() != EstadoPublicacion.DISPONIBLE) {
            throw new PublicacionNoDisponibleException();
        }
    }

    private void validarEstado(Intercambio intercambio, EstadoIntercambio... estadosPermitidos) {
        if (!Arrays.asList(estadosPermitidos).contains(intercambio.getEstado())) {
            throw new EstadoIntercambioInvalidoException(
                    "No se puede realizar esta acción con el intercambio en estado " + intercambio.getEstado());
        }
    }

    private void validarEsReceptor(Intercambio intercambio, Usuario usuario) {
        if (!intercambio.getId().getPropietarioIdSolicitante().equals(usuario.getEmail())) {
            throw new AccionNoPermitidaException("Solo el receptor puede realizar esta acción");
        }
    }

    private void validarEsParticipante(Intercambio intercambio, Usuario usuario) {
        IntercambioId id = intercambio.getId();
        boolean esProponente = id.getPropietarioIdOfrecida().equals(usuario.getEmail());
        boolean esReceptor = id.getPropietarioIdSolicitante().equals(usuario.getEmail());
        if (!esProponente && !esReceptor) {
            throw new AccionNoPermitidaException("No participás en este intercambio");
        }
    }
}