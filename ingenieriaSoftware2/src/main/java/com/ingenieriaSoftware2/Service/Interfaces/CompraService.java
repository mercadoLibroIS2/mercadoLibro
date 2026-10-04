package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.CompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CompraResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;

import java.util.List;
import java.util.UUID;

public interface CompraService {
    CompraResponseDTO pedirCompra(UUID compradorId, CompraRequestDTO request);
    CompraResponseDTO aceptar(UUID propietarioId, CompraId compraId);
    CompraResponseDTO rechazar(UUID propietarioId, CompraId compraId);
    CompraResponseDTO confirmar(UUID compradorId, CompraId compraId);
    List<CompraResponseDTO> enviadas(UUID compradorId);
    List<CompraResponseDTO> recibidas(UUID propietarioId);
    List<CompraResponseDTO> confirmadas(UUID usuarioId);
}
