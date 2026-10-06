package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.CompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CompraResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;

import java.util.List;
import java.util.UUID;

public interface CompraService {

    CompraResponseDTO realizarCompra(CompraRequestDTO request, UUID compradorId);

    CompraResponseDTO obtenerPorId(CompraId compraId);

    List<CompraResponseDTO> listarPorComprador(UUID compradorId);

    List<CompraResponseDTO> listarPorVendedor(UUID vendedorId);

    CompraResponseDTO confirmarPago(CompraId compraId, UUID compradorId);

    CompraResponseDTO marcarComoEnviada(CompraId compraId, UUID vendedorId, String infoEnvio);

    CompraResponseDTO marcarComoEntregada(CompraId compraId, UUID compradorId);

    CompraResponseDTO cancelarCompra(CompraId compraId, UUID usuarioId, String motivo);
}
