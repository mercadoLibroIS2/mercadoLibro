package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.ReseniaRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.ReseniaResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosReseniaId;
import com.ingenieriaSoftware2.Entity.Ids.ReseniaId;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosResenia;
import com.ingenieriaSoftware2.Entity.Resenia;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Enums.TipoMovimiento;
import com.ingenieriaSoftware2.Exception.AtributoFueraDeRangoException;
import com.ingenieriaSoftware2.Exception.Intercambio.IntercambioNoExiste;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.ReseniaMapper;
import com.ingenieriaSoftware2.Repository.*;
import com.ingenieriaSoftware2.Service.Interfaces.ReseniaService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
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

    private Long puntosResenia = 50L;

    @Override
    public ReseniaResponseDTO crearResenia(ReseniaRequestDTO dto, UUID usuarioId) {
        if (dto.calificacion()>5||dto.calificacion()<0||dto.comentario().length()>500){
            throw new AtributoFueraDeRangoException();
        }

        Usuario usuario = usuarioRepository.findById(String.valueOf(usuarioId)).orElseThrow(()-> new UsuarioNoEncontrado());
        String email = usuario.getEmail();
        Intercambio intercambio = intercambioRepository.findById(dto.intercambioId()).orElseThrow(()-> new IntercambioNoExiste());
        boolean solicitanteReviewer;
        if (email.equals(intercambio.getId().getPropietarioIdSolicitante())) {
            solicitanteReviewer = true;
        } else if (email.equals(intercambio.getId().getPropietarioIdOfrecida())) {
            solicitanteReviewer = false;
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Solo las partes del intercambio pueden reseñarlo");
        }

        // 3. Solo se reseña un intercambio terminado
        if (intercambio.getEstado() != EstadoIntercambio.COMPLETADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Solo se puede reseñar un intercambio completado");
        }

        // 4. Una reseña por parte y por intercambio (la clave ya lo garantiza, pero así el error es claro)
        ReseniaId reseniaId = new ReseniaId(intercambio.getId(), solicitanteReviewer);
        if (reseniaRepository.existsById(reseniaId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ya dejaste una reseña para este intercambio");
        }

        Resenia resenia = new Resenia();
        resenia.setId(reseniaId);
        resenia.setIntercambio(intercambio);
        resenia.setCalificacion(dto.calificacion());
        resenia.setComentario(dto.comentario() != null ? dto.comentario().trim() : null);
        reseniaRepository.save(resenia);

        // 6. Recompensa en puntos para quien reseña
        Usuario reviewer = usuarioRepository.findById(email).orElseThrow(() -> new UsuarioNoEncontrado());

        MovimientoPuntosResenia movimiento = new MovimientoPuntosResenia();
        movimiento.setMovimientoPuntosReseniaId(
                new MovimientoPuntosReseniaId(reseniaId, usuarioId, TipoMovimiento.INGRESO));
        movimiento.setResenia(resenia);
        movimiento.setUsuario(reviewer);
        movimiento.setMonto(puntosResenia);
        movimientoPuntosReseniaRepository.save(movimiento);

        // Si Usuario guarda el saldo en una columna, actualizalo acá, por ejemplo:
        // reviewer.setSaldoTotal(reviewer.getSaldoTotal() + PUNTOS_POR_RESENIA);

        // TODO (tarea 30.1): recalcular reputacionPromedio de la otra parte del intercambio.

        return reseniaMapper.toDTO(resenia);

    }
}
