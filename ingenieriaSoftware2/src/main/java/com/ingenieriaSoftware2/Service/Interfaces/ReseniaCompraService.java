package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.ReseniaCompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.ReseniaCompraResponseDTO;

import java.util.List;
import java.util.UUID;

public interface ReseniaCompraService {
    ReseniaCompraResponseDTO crear(ReseniaCompraRequestDTO dto, UUID usuarioId);

    List<ReseniaCompraResponseDTO> listarTodas();
}
