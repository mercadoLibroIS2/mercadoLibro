package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.ReseniaCompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.ReseniaCompraResponseDTO;
import com.ingenieriaSoftware2.Entity.Compra;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Entity.Ids.ReseniaCompraId;
import com.ingenieriaSoftware2.Entity.ReseniaCompra;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCompra;
import com.ingenieriaSoftware2.Enums.TipoNotificacion;
import com.ingenieriaSoftware2.Exception.Compra.CompraNoEncontradaException;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Repository.CompraRepository;
import com.ingenieriaSoftware2.Repository.ReseniaCompraRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Implementations.Auxiliares.ReputacionCalculadora;
import com.ingenieriaSoftware2.Service.Interfaces.MovimientoPuntosService;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import com.ingenieriaSoftware2.Service.Interfaces.ReseniaCompraService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/** Reseñas de compras por puntos: mismas reglas y bono que las de trueques. */
@Service
public class ReseniaCompraServiceImpl implements ReseniaCompraService {

    static final int PUNTOS_RESENIA = 50;

    @Autowired
    private ReseniaCompraRepository reseniaCompraRepository;
    @Autowired
    private CompraRepository compraRepository;
    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private ReputacionCalculadora reputacionCalculadora;
    @Autowired(required = false)
    private MovimientoPuntosService movimientoPuntosService;
    @Autowired(required = false)
    private NotificacionService notificacionService;

    @Override
    @Transactional
    public ReseniaCompraResponseDTO crear(ReseniaCompraRequestDTO dto, UUID usuarioId) {
        Usuario reviewer = usuarioRepository.findById(usuarioId).orElseThrow(UsuarioNoEncontrado::new);
        CompraId compraId = new CompraId(dto.compradorEmail(), dto.isbn(), dto.propietarioEmail(), dto.horaPublicacion());
        Compra compra = compraRepository.findById(compraId).orElseThrow(CompraNoEncontradaException::new);

        boolean compradorReviewer;
        if (reviewer.getEmail().equalsIgnoreCase(compraId.getCompradorEmail())) {
            compradorReviewer = true;
        } else if (reviewer.getEmail().equalsIgnoreCase(compraId.getPropietarioEmail())) {
            compradorReviewer = false;
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El usuario no participa en la compra");
        }
        if (compra.getEstado() != EstadoCompra.ENTREGADA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solo se pueden reseñar compras completadas");
        }

        ReseniaCompraId id = new ReseniaCompraId(compraId, compradorReviewer);
        if (reseniaCompraRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya dejaste una reseña de esta compra");
        }

        ReseniaCompra resenia = new ReseniaCompra();
        resenia.setId(id);
        resenia.setCalificacion(dto.calificacion());
        resenia.setComentario(dto.comentario() != null && !dto.comentario().isBlank() ? dto.comentario().trim() : null);
        reseniaCompraRepository.save(resenia);

        String emailEvaluado = compradorReviewer ? compraId.getPropietarioEmail() : compraId.getCompradorEmail();
        Usuario evaluado = usuarioRepository.findByEmail(emailEvaluado).orElseThrow(UsuarioNoEncontrado::new);
        reputacionCalculadora.recalcular(evaluado);

        if (movimientoPuntosService != null) {
            movimientoPuntosService.acreditarBonificacionSistema(reviewer, PUNTOS_RESENIA, "Bonificación por reseña");
        }
        notificar(emailEvaluado, TipoNotificacion.RESENIA_RECIBIDA,
                reviewer.getNombre() + " te calificó con " + dto.calificacion() + " de 5 estrellas.");
        notificar(reviewer.getEmail(), TipoNotificacion.PUNTOS_GANADOS,
                "Sumaste +" + PUNTOS_RESENIA + " pts por dejar una reseña.");

        return toDTO(resenia);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReseniaCompraResponseDTO> listarTodas() {
        return reseniaCompraRepository.findAll().stream().map(this::toDTO).toList();
    }

    private void notificar(String email, TipoNotificacion tipo, String mensaje) {
        if (notificacionService == null) {
            return;
        }
        try {
            notificacionService.crear(email, tipo, mensaje);
        } catch (RuntimeException ignored) {
            // Una notificación fallida no debe impedir la reseña
        }
    }

    private ReseniaCompraResponseDTO toDTO(ReseniaCompra r) {
        CompraId c = r.getId().getCompraId();
        boolean compradorReviewer = Boolean.TRUE.equals(r.getId().getCompradorReviewer());
        return new ReseniaCompraResponseDTO(
                c.getCompradorEmail(), c.getIsbn(), c.getPropietarioEmail(), c.getHoraPublicacion(),
                compradorReviewer,
                compradorReviewer ? c.getCompradorEmail() : c.getPropietarioEmail(),
                compradorReviewer ? c.getPropietarioEmail() : c.getCompradorEmail(),
                r.getCalificacion(), r.getComentario());
    }
}
