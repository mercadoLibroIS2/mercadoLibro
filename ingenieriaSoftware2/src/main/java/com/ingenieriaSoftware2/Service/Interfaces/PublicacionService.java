package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.PublicacionRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.PublicacionResponseDTO;

public interface PublicacionService {
    PublicacionResponseDTO publicarLibro(PublicacionRequestDTO request, String email);
}
