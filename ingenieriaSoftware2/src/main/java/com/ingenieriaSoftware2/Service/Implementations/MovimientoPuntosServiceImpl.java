package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Response.MovimientoPuntosResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.SaldoPuntosResponseDTO;

import com.ingenieriaSoftware2.Entity.EventoSistema;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosCompra;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosIntercambio;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosResenia;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosSistema;
import com.ingenieriaSoftware2.Entity.Usuario;

import com.ingenieriaSoftware2.Entity.Ids.EventoSistemaId;
import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosSistemaId;

import com.ingenieriaSoftware2.Enums.TipoEventoSistema;
import com.ingenieriaSoftware2.Enums.TipoMovimiento;

import com.ingenieriaSoftware2.Repository.EventoSistemaRepository;
import com.ingenieriaSoftware2.Repository.MovimientoPuntosCompraRepository;
import com.ingenieriaSoftware2.Repository.MovimientoPuntosIntercambioRepository;
import com.ingenieriaSoftware2.Repository.MovimientoPuntosReseniaRepository;
import com.ingenieriaSoftware2.Repository.MovimientoPuntosSistemaRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;

import com.ingenieriaSoftware2.Service.Interfaces.MovimientoPuntosService;
import com.ingenieriaSoftware2.Service.Interfaces.UsuarioService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class MovimientoPuntosServiceImpl implements MovimientoPuntosService {

    private static final int PUNTOS_INICIALES = 500;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private EventoSistemaRepository eventoSistemaRepository;

    @Autowired
    private MovimientoPuntosSistemaRepository movimientoPuntosSistemaRepository;

    @Autowired
    private MovimientoPuntosCompraRepository movimientoPuntosCompraRepository;

    @Autowired
    private MovimientoPuntosIntercambioRepository movimientoPuntosIntercambioRepository;

    @Autowired
    private MovimientoPuntosReseniaRepository movimientoPuntosReseniaRepository;

    @Autowired
    private UsuarioService usuarioService;

    @Override
    @Transactional
    public void asignarPuntosIniciales(Usuario usuario) {

        usuario.setSaldoTotal(BigDecimal.valueOf(PUNTOS_INICIALES));
        usuario.setSaldoReservado(BigDecimal.ZERO);

        usuarioRepository.save(usuario);

        EventoSistemaId eventoId = new EventoSistemaId(
                TipoEventoSistema.ALTA_INICIAL,
                LocalDateTime.now()
        );

        EventoSistema evento = new EventoSistema();
        evento.setEventoSistemaId(eventoId);
        evento.setDescripcion("Asignación inicial de puntos");

        eventoSistemaRepository.save(evento);

        MovimientoPuntosSistemaId movimientoId =
                new MovimientoPuntosSistemaId(
                        eventoId,
                        usuario.getEmail(),
                        TipoMovimiento.INGRESO
                );

        MovimientoPuntosSistema movimiento =
                new MovimientoPuntosSistema();

        movimiento.setMovimientoPuntosSistemaId(movimientoId);
        movimiento.setMonto((long) PUNTOS_INICIALES);
        movimiento.setEventoSistema(evento);
        movimiento.setUsuario(usuario);

        movimientoPuntosSistemaRepository.save(movimiento);
    }

    @Override
    public SaldoPuntosResponseDTO obtenerSaldoActual() {

        Usuario usuario = usuarioService.getUsuarioActual();

        BigDecimal saldoTotal =
                usuario.getSaldoTotal() != null
                        ? usuario.getSaldoTotal()
                        : BigDecimal.ZERO;

        BigDecimal saldoReservado =
                usuario.getSaldoReservado() != null
                        ? usuario.getSaldoReservado()
                        : BigDecimal.ZERO;

        BigDecimal saldoDisponible = saldoTotal.subtract(saldoReservado);

        return new SaldoPuntosResponseDTO(
                saldoTotal,
                saldoReservado,
                saldoDisponible
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovimientoPuntosResponseDTO> obtenerHistorial() {

        Usuario usuario = usuarioService.getUsuarioActual();

        List<MovimientoPuntosResponseDTO> historial =
                new ArrayList<>();

        // ============================
        // MOVIMIENTOS DE SISTEMA
        // ============================

        List<MovimientoPuntosSistema> movimientosSistema =
                movimientoPuntosSistemaRepository
                        .findByMovimientoPuntosSistemaId_UsuarioId(
                                usuario.getEmail()
                        );

        movimientosSistema.forEach(m ->
                historial.add(
                        new MovimientoPuntosResponseDTO(
                                m.getMovimientoPuntosSistemaId()
                                        .getTipoMovimiento()
                                        .name(),

                                m.getMonto(),

                                m.getMovimientoPuntosSistemaId()
                                        .getEventoSistemaId()
                                        .getTipoEventoSistema()
                                        .name(),

                                m.getMovimientoPuntosSistemaId()
                                        .getEventoSistemaId()
                                        .getFechaEvento()
                        )
                )
        );

        // ============================
        // MOVIMIENTOS DE COMPRA
        // ============================

        List<MovimientoPuntosCompra> movimientosCompra =
                movimientoPuntosCompraRepository
                        .findByMovimientoPuntosCompraId_UsuarioId(
                                usuario.getEmail()
                        );

        movimientosCompra.forEach(m ->
                historial.add(
                        new MovimientoPuntosResponseDTO(
                                m.getMovimientoPuntosCompraId()
                                        .getTipoMovimiento()
                                        .name(),

                                m.getMonto(),

                                "COMPRA",

                                null
                        )
                )
        );

        // ============================
        // MOVIMIENTOS DE INTERCAMBIO
        // ============================

        List<MovimientoPuntosIntercambio> movimientosIntercambio =
                movimientoPuntosIntercambioRepository
                        .findByMovimientoPuntosIntercambioId_UsuarioId(
                                usuario.getEmail()
                        );

        movimientosIntercambio.forEach(m ->
                historial.add(
                        new MovimientoPuntosResponseDTO(
                                m.getMovimientoPuntosIntercambioId()
                                        .getTipoMovimiento()
                                        .name(),

                                m.getMonto(),

                                "INTERCAMBIO",

                                null
                        )
                )
        );

        // ============================
        // MOVIMIENTOS DE RESEÑA
        // ============================

        List<MovimientoPuntosResenia> movimientosResenia =
                movimientoPuntosReseniaRepository
                        .findByUsuario_Id(
                                usuario.getId()
                        );

        movimientosResenia.forEach(m ->
                historial.add(
                        new MovimientoPuntosResponseDTO(
                                m.getMovimientoPuntosReseniaId()
                                        .getTipoMovimiento()
                                        .name(),

                                m.getMonto(),

                                "RESENA",

                                null
                        )
                )
        );

        // Ordenar por fecha.
        // Los movimientos que todavía no tienen fecha quedan al final.
        historial.sort(
                Comparator.comparing(
                        MovimientoPuntosResponseDTO::fecha,
                        Comparator.nullsLast(
                                Comparator.reverseOrder()
                        )
                )
        );

        return historial;
    }
}