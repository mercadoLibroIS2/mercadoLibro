package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.PublicacionRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.PublicacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;

public interface PublicacionService {
    PublicacionResponseDTO publicarLibro(PublicacionRequestDTO request, String email);
    PublicacionResponseDTO verDetallesPublicacion(PublicacionId id);
    void editarPublicacion(PublicacionId id, PublicacionRequestDTO dto);
}
