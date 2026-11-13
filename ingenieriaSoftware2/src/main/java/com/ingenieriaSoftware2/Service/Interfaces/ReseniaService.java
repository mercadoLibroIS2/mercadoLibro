package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.ReseniaRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.ReseniaResponseDTO;

import java.util.List;
import java.util.UUID;

public interface ReseniaService {
    ReseniaResponseDTO crearResenia(ReseniaRequestDTO dto, UUID usuarioId);
    List<ReseniaResponseDTO> listarTodas();
    List<ReseniaResponseDTO> listarPorUsuario(String email);
}
