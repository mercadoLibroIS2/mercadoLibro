package com.ingenieriaSoftware2.Mapper;

import com.ingenieriaSoftware2.DTO.Request.ReseniaRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.ReseniaResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Resenia;
import com.ingenieriaSoftware2.Exception.Intercambio.IntercambioNoExiste;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Repository.ReseniaRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ReseniaMapper {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private IntercambioRepository intercambioRepository;

    @Autowired
    private ReseniaRepository reseniaRepository;

    public Resenia toEntity(ReseniaRequestDTO dto) {
        Resenia resenia = new Resenia();
        resenia.setCalificacion(dto.calificacion());
        resenia.setComentario(limpiar(dto.comentario()));
        return resenia;
    }

    public ReseniaResponseDTO toDTO(Resenia resenia) {
        IntercambioId intercambioId = new IntercambioId(
            resenia.getId().getIsbnSolicitante(),
            resenia.getId().getPropietarioIdSolicitante(),
            resenia.getId().getHoraDePublicacionSolicitante(),
            resenia.getId().getIsbnOfrecida(),
            resenia.getId().getPropietarioIdOfrecida(),
            resenia.getId().getHoraDePublicacionOfrecida());
        boolean solicitanteReviewer = Boolean.TRUE.equals(resenia.getId().getSolicitanteReviewer());

        String emailSolicitante = intercambioId.getPropietarioIdSolicitante();
        String emailOfrecida    = intercambioId.getPropietarioIdOfrecida();

        return new ReseniaResponseDTO(
                intercambioId,
                solicitanteReviewer,
                solicitanteReviewer ? emailSolicitante : emailOfrecida,
                solicitanteReviewer ? emailOfrecida    : emailSolicitante,
                resenia.getCalificacion(),
                resenia.getComentario()
        );
    }

    private String limpiar(String texto) {
        if (texto == null) return null;
        String t = texto.trim();
        return t.isEmpty() ? null : t;
    }
}