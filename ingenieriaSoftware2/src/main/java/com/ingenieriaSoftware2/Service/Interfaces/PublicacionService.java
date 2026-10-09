package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.PublicacionRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.PublicacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;

import java.util.List;

public interface PublicacionService {
    PublicacionResponseDTO publicarLibro(PublicacionRequestDTO request, String email);
    List<PublicacionResponseDTO> listarPublicaciones();
    List<PublicacionResponseDTO> listarMisPublicaciones(String email);
    List<PublicacionResponseDTO> listarPublicacionesDisponibles();
    PublicacionResponseDTO verDetallesPublicacion(PublicacionId id);
    void editarPublicacion(PublicacionId id, PublicacionRequestDTO dto, String emailUsuario);
    void eliminarPublicacion(PublicacionId id, String emailUsuario);
}
