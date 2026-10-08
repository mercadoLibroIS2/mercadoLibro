package com.ingenieriaSoftware2.Mapper;

import com.ingenieriaSoftware2.DTO.Response.PublicacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import org.springframework.stereotype.Component;

@Component
public class PublicacionMapper {
    public PublicacionResponseDTO toDTO(Publicacion publicacion){
        PublicacionId publicacionId = publicacion.getId();
        return new PublicacionResponseDTO(
                publicacionId,
                publicacion.getEstadoFisico(),
                publicacion.getValorPuntosSolicitado(),
                publicacion.getValorReferenciaCalculado(),
                publicacion.getComentario()
        );
    }
}
