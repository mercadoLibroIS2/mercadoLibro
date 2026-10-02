package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.ReseniaRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.ReseniaResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosReseniaId;
import com.ingenieriaSoftware2.Entity.Ids.ReseniaId;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosResenia;
import com.ingenieriaSoftware2.Entity.Resenia;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Enums.TipoMovimiento;
import com.ingenieriaSoftware2.Eventos.ReseniaCreadaEvent;
import com.ingenieriaSoftware2.Exception.AtributoFueraDeRangoException;
import com.ingenieriaSoftware2.Exception.Intercambio.IntercambioNoExiste;
import com.ingenieriaSoftware2.Exception.Resenia.NoInvolucradoException;
import com.ingenieriaSoftware2.Exception.Resenia.ReseniaExistenteException;
import com.ingenieriaSoftware2.Exception.Resenia.ReseniaIntercambioIncompletoException;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.ReseniaMapper;
import com.ingenieriaSoftware2.Repository.*;
import com.ingenieriaSoftware2.Service.Interfaces.ReseniaService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class ReseniaServiceImpl implements ReseniaService {

    @Autowired
    private ReseniaRepository reseniaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private IntercambioRepository intercambioRepository;

    @Autowired
    private ReseniaMapper reseniaMapper;

    @Autowired
    private MovimientoPuntosReseniaRepository movimientoPuntosReseniaRepository;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    private Long puntosResenia = 50L;

    @Override
    public ReseniaResponseDTO crearResenia(
            ReseniaRequestDTO dto,
            UUID usuarioId
    ) {

        if (dto.calificacion() > 5
                || dto.calificacion() < 0
                || (dto.comentario() != null && dto.comentario().length() > 500)) {

            throw new AtributoFueraDeRangoException();
        }

        Usuario usuario = usuarioRepository
                .findById(usuarioId)
                .orElseThrow(UsuarioNoEncontrado::new);

        String email = usuario.getEmail();

        Intercambio intercambio = intercambioRepository
                .findById(dto.intercambioId())
                .orElseThrow(IntercambioNoExiste::new);

        boolean solicitanteReviewer;

        if (email.equals(intercambio.getId().getPropietarioIdSolicitante())) {

            solicitanteReviewer = true;

        } else if (email.equals(intercambio.getId().getPropietarioIdOfrecida())) {

            solicitanteReviewer = false;

        } else {
            throw new NoInvolucradoException();
        }

        if (intercambio.getEstado() != EstadoIntercambio.COMPLETADO) {
            throw new ReseniaIntercambioIncompletoException();
        }

        ReseniaId reseniaId = new ReseniaId(intercambio.getId(), solicitanteReviewer);
        if (reseniaRepository.existsById(reseniaId)) {
            throw new ReseniaExistenteException();
        }

        Resenia resenia = new Resenia();

        resenia.setId(reseniaId);
        resenia.setIntercambio(intercambio);
        resenia.setCalificacion(dto.calificacion());
        resenia.setComentario(
                dto.comentario() != null
                        ? dto.comentario().trim()
                        : null
        );

        reseniaRepository.save(resenia);

        Usuario reviewer = usuario;

        MovimientoPuntosResenia movimiento =
                new MovimientoPuntosResenia();

        movimiento.setMovimientoPuntosReseniaId(
                new MovimientoPuntosReseniaId(
                        reseniaId,
                        usuarioId,
                        TipoMovimiento.INGRESO
                )
        );

        movimiento.setResenia(resenia);
        movimiento.setUsuario(reviewer);
        movimiento.setMonto(puntosResenia);

        movimientoPuntosReseniaRepository.save(movimiento);

        reviewer.setSaldoTotal((int) (reviewer.getSaldoTotal() + puntosResenia));
        usuarioRepository.save(reviewer);

        calcularReputacion(intercambio,solicitanteReviewer);

        String emailEvaluado = solicitanteReviewer
                ? intercambio.getId().getPropietarioIdOfrecida()
                : intercambio.getId().getPropietarioIdSolicitante();
        eventPublisher.publishEvent(new ReseniaCreadaEvent(emailEvaluado, dto.calificacion()));

        return reseniaMapper.toDTO(resenia);

    }

    private void calcularReputacion(Intercambio intercambio, boolean solicitanteReviewer){
        String emailEvaluado = solicitanteReviewer
                ? intercambio.getId().getPropietarioIdOfrecida()
                : intercambio.getId().getPropietarioIdSolicitante();

        Usuario evaluado = usuarioRepository.findById(UUID.fromString(emailEvaluado))
                .orElseThrow(UsuarioNoEncontrado::new);

        float promedio = reseniaRepository.calcularPromedioRecibido(emailEvaluado);

        evaluado.setReputacionPromedio(promedio);
        usuarioRepository.save(evaluado);
    }
}
