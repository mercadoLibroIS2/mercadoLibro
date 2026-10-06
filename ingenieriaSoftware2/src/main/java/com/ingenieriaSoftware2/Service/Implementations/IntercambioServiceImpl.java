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
import com.ingenieriaSoftware2.Repository.*;
import com.ingenieriaSoftware2.Service.Interfaces.IntercambioService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class IntercambioServiceImpl implements IntercambioService {
    private static final int PUNTOS_BONIFICACION = 100;

    @Autowired
    private CompraRepository compraRepository;

    @Autowired
    private IntercambioRepository intercambioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private MovimientoPuntosIntercambioRepository movimientoRepository;

    @Autowired
    private IntercambioMapper intercambioMapper;

    @Override
    @Transactional
    public IntercambioResponseDTO proponerIntercambio(IntercambioRequestDTO request, UUID usuarioProponenteId) {
        Usuario proponente = buscarUsuario(usuarioProponenteId);
        String emailProponente = proponente.getEmail();

        if (emailProponente.equals(request.emailPropietarioSolicitada())) {
            throw new AccionNoPermitidaException("No podés proponer un intercambio con tu propia publicación");
        }

        PublicacionId idOfrecida = new PublicacionId(
                request.isbnOfrecida(), emailProponente, request.horaPublicacionOfrecida());
        PublicacionId idSolicitada = new PublicacionId(
                request.isbnSolicitada(), request.emailPropietarioSolicitada(), request.horaPublicacionSolicitada());

        Publicacion ofrecida = publicacionRepository.findById(idOfrecida)
                .orElseThrow(() -> new PublicacionNoExisteException());
        Publicacion solicitada = publicacionRepository.findById(idSolicitada)
                .orElseThrow(() -> new PublicacionNoExisteException());

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

        Intercambio intercambio = intercambioRepository.findById(id).orElse(null);

        if (intercambio != null) {
            boolean terminado = intercambio.getEstado() == EstadoIntercambio.RECHAZADO
                    || intercambio.getEstado() == EstadoIntercambio.CANCELADO;

            Usuario receptor = buscarPorEmail(request.emailPropietarioSolicitada());
            boolean tuvoReserva =
                    movimientoRepository.existsById(new MovimientoPuntosIntercambioId(id, proponente.getId(), TipoMovimiento.RESERVA))
                            || movimientoRepository.existsById(new MovimientoPuntosIntercambioId(id, receptor.getId(), TipoMovimiento.RESERVA));

            if (!terminado || tuvoReserva) {
                throw new EstadoIntercambioInvalidoException("Ya existe un intercambio entre estas publicaciones");
            }
            intercambio.setMotivoRechazo(null);
        } else {
            intercambio = new Intercambio();
            intercambio.setId(id);
        }

        int diferencia = calcularDiferencia(ofrecida, solicitada);
        intercambio.setPublicacionOfrecida(ofrecida);
        intercambio.setPublicacionSolicitante(solicitada);
        intercambio.setEstado(EstadoIntercambio.PENDIENTE);
        intercambio.setPuntosComprometidos(Math.abs(diferencia));

        Intercambio guardado = intercambioRepository.save(intercambio);

        // Diferencia positiva: el proponente ofrece el libro de menor valor, así que él es el deudor
        // y sus puntos se reservan ahora
        if (diferencia > 0) {
            reservarPuntos(proponente, guardado);
        }

        return intercambioMapper.toDTO(guardado);
    }

    @Override
    @Transactional
    public IntercambioResponseDTO obtenerPorId(IntercambioId intercambioId) {
        return intercambioMapper.toDTO(buscarIntercambio(intercambioId));
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
    public IntercambioResponseDTO aceptarIntercambio(IntercambioId intercambioId, UUID usuarioReceptorId) {
        Intercambio intercambio = buscarIntercambio(intercambioId);
        Usuario receptor = buscarUsuario(usuarioReceptorId);
        validarEsReceptor(intercambio, receptor);
        validarEstado(intercambio, EstadoIntercambio.PENDIENTE);

        Publicacion ofrecida = intercambio.getPublicacionOfrecida();
        Publicacion solicitada = intercambio.getPublicacionSolicitante();

        // Alguna de las dos pudo quedar reservada por una compra o por otro intercambio
        validarPublicacionActiva(ofrecida);
        validarPublicacionActiva(solicitada);

        // Si el receptor es el dueño del libro de menor valor, sus puntos se reservan al aceptar
        if (receptor.getEmail().equals(obtenerEmailDeudor(intercambio))) {
            reservarPuntos(receptor, intercambio);
        }

        cambiarEstadoPublicaciones(intercambio, EstadoPublicacion.RESERVADA);
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
        Intercambio intercambio = buscarIntercambio(intercambioId);
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
        Intercambio intercambio = buscarIntercambio(intercambioId);
        validarEsParticipante(intercambio, buscarUsuario(usuarioId));
        validarEstado(intercambio,
                EstadoIntercambio.PENDIENTE,
                EstadoIntercambio.ACEPTADO,
                EstadoIntercambio.CONFIRMADO_POR_PROPONENTE,
                EstadoIntercambio.CONFIRMADO_POR_RECEPTOR);

        liberarReservaSiExiste(intercambio);

        // Las publicaciones están reservadas desde que se aceptó
        if (intercambio.getEstado() != EstadoIntercambio.PENDIENTE) {
            cambiarEstadoPublicaciones(intercambio, EstadoPublicacion.DISPONIBLE);
        }

        intercambio.setEstado(EstadoIntercambio.CANCELADO);
        return intercambioMapper.toDTO(intercambio);
    }

    @Override
    @Transactional
    public IntercambioResponseDTO completarIntercambio(IntercambioId intercambioId, UUID usuarioId) {
        Intercambio intercambio = buscarIntercambio(intercambioId);
        Usuario usuario = buscarUsuario(usuarioId);
        validarEsParticipante(intercambio, usuario);
        validarEstado(intercambio, EstadoIntercambio.ACEPTADO,
                EstadoIntercambio.CONFIRMADO_POR_PROPONENTE, EstadoIntercambio.CONFIRMADO_POR_RECEPTOR);

        boolean esProponente = intercambio.getId().getPropietarioIdOfrecida().equals(usuario.getEmail());
        EstadoIntercambio estado = intercambio.getEstado();

        // Primera confirmación: se registra y se espera al otro
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
        Usuario proponente = buscarPorEmail(intercambio.getId().getPropietarioIdOfrecida());
        Usuario receptor = buscarPorEmail(intercambio.getId().getPropietarioIdSolicitante());

        pagarCompensacion(intercambio, proponente, receptor);
        bonificar(proponente, intercambio);
        bonificar(receptor, intercambio);

        cambiarEstadoPublicaciones(intercambio, EstadoPublicacion.VENDIDA);
        intercambio.setEstado(EstadoIntercambio.COMPLETADO);
        return intercambioMapper.toDTO(intercambio);
    }

    @Override
    @Transactional
    public EstadoIntercambio consultarEstado(IntercambioId intercambioId) {
        return buscarIntercambio(intercambioId).getEstado();
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
     * Valor de la solicitada menos el de la ofrecida.
     * Positivo: el proponente ofrece el libro de menor valor y debe la diferencia.
     * Negativo: el receptor tiene el libro de menor valor y debe la diferencia.
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

    /**
     * El deudor es el dueño de la publicación de menor valor de referencia.
     * Devuelve null si los dos libros valen lo mismo.
     * Los valores no cambian mientras el intercambio está activo porque
     * editarPublicacion lo bloquea.
     */
    private String obtenerEmailDeudor(Intercambio intercambio) {
        if (intercambio.getPuntosComprometidos() == 0) return null;

        int diferencia = calcularDiferencia(
                intercambio.getPublicacionOfrecida(),
                intercambio.getPublicacionSolicitante());

        return diferencia > 0
                ? intercambio.getId().getPropietarioIdOfrecida()
                : intercambio.getId().getPropietarioIdSolicitante();
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
        String emailDeudor = obtenerEmailDeudor(intercambio);
        if (emailDeudor == null) return;

        Usuario deudor = buscarPorEmail(emailDeudor);
        MovimientoPuntosIntercambioId reservaId = new MovimientoPuntosIntercambioId(
                intercambio.getId(), deudor.getId(), TipoMovimiento.RESERVA);

        // Si el deudor es el receptor y todavía no había aceptado, no hay nada reservado
        if (!movimientoRepository.existsById(reservaId)) return;

        int monto = intercambio.getPuntosComprometidos();
        deudor.setSaldoReservado(saldoReservado(deudor) - monto);
        registrarMovimiento(intercambio, deudor, TipoMovimiento.LIBERACION_RESERVA, monto);
    }

    private void pagarCompensacion(Intercambio intercambio, Usuario proponente, Usuario receptor) {
        String emailDeudor = obtenerEmailDeudor(intercambio);
        if (emailDeudor == null) return;

        boolean deudorEsProponente = proponente.getEmail().equals(emailDeudor);
        Usuario deudor = deudorEsProponente ? proponente : receptor;
        Usuario acreedor = deudorEsProponente ? receptor : proponente;
        int monto = intercambio.getPuntosComprometidos();

        // Los puntos reservados salen del saldo del deudor
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

    private void registrarMovimiento(Intercambio intercambio, Usuario usuario,
                                     TipoMovimiento tipo, int monto) {
        MovimientoPuntosIntercambio movimiento = new MovimientoPuntosIntercambio();
        movimiento.setMovimientoPuntosIntercambioId(
                new MovimientoPuntosIntercambioId(intercambio.getId(), usuario.getId(), tipo));
        movimiento.setIntercambio(intercambio);
        movimiento.setUsuario(usuario);
        movimiento.setMonto((long) monto);
        movimientoRepository.save(movimiento);
    }

    // Los saldos son Integer y pueden venir en null en usuarios recién creados
    private int saldoTotal(Usuario usuario) {
        return usuario.getSaldoTotal() != null ? usuario.getSaldoTotal() : 0;
    }

    private int saldoReservado(Usuario usuario) {
        return usuario.getSaldoReservado() != null ? usuario.getSaldoReservado() : 0;
    }

    // ---------- Métodos auxiliares ----------

    private void cambiarEstadoPublicaciones(Intercambio intercambio, EstadoPublicacion estado) {
        intercambio.getPublicacionOfrecida().setEstadoPublicacion(estado);
        intercambio.getPublicacionSolicitante().setEstadoPublicacion(estado);
    }

    private Intercambio buscarIntercambio(IntercambioId id) {
        return intercambioRepository.findById(id).orElseThrow(() -> new IntercambioNoExiste());
    }

    private Usuario buscarUsuario(UUID usuarioId) {
        return usuarioRepository.findById(usuarioId).orElseThrow(() -> new UsuarioNoEncontrado());
    }

    private Usuario buscarPorEmail(String email) {
        return usuarioRepository.findByEmail(email).orElseThrow(() -> new UsuarioNoEncontrado());
    }

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
}