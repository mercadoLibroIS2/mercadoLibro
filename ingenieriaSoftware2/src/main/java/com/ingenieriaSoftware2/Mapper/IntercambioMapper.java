package com.ingenieriaSoftware2.Mapper;

import com.ingenieriaSoftware2.DTO.Response.IntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Intercambio;
import org.springframework.stereotype.Component;

@Component
public class IntercambioMapper {

    public IntercambioResponseDTO toDTO(Intercambio intercambio) {
        IntercambioId id = intercambio.getId();
        return new IntercambioResponseDTO(
                id.getIsbnOfrecida(),
                intercambio.getPublicacionOfrecida().getLibro().getTitulo(),
                id.getPropietarioIdOfrecida(),
                id.getHoraDePublicacionOfrecida(),
                id.getIsbnSolicitante(),
                intercambio.getPublicacionSolicitante().getLibro().getTitulo(),
                id.getPropietarioIdSolicitante(),
                id.getHoraDePublicacionSolicitante(),
                intercambio.getEstado(),
                intercambio.getPuntosComprometidos(),
                intercambio.getMotivoRechazo()
        );
    }
}