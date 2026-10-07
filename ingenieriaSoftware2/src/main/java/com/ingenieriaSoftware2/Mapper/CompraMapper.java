package com.ingenieriaSoftware2.Mapper;

import com.ingenieriaSoftware2.DTO.Response.CompraResponseDTO;
import com.ingenieriaSoftware2.Entity.Compra;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import org.springframework.stereotype.Component;

@Component
public class CompraMapper {

    public CompraResponseDTO toDTO(Compra compra) {
        CompraId id = compra.getId();
        return new CompraResponseDTO(
                id.getIsbn(),
                compra.getLibro().getTitulo(),
                id.getPropietarioEmail(),
                id.getHoraPublicacion(),
                id.getCompradorEmail(),
                compra.getPuntos(),
                compra.getEstado(),
                compra.getTimestamp(),
                compra.getInfoEnvio(),
                compra.getMotivoCancelacion()
        );
    }
}