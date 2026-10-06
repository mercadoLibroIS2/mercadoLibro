package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.CompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CompraResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;

import java.util.List;
import java.util.UUID;

public interface CompraService {
    // Alta de una compra sobre un libro publicado
    CompraResponseDTO realizarCompra(CompraRequestDTO request, UUID compradorId);

    CompraResponseDTO obtenerPorId(CompraId compraId);

    List<CompraResponseDTO> listarPorComprador(UUID compradorId);

    List<CompraResponseDTO> listarPorVendedor(UUID vendedorId);

    // Transiciones de estado del flujo de compra
    CompraResponseDTO confirmarPago(CompraId compraId,UUID compradorId);

    CompraResponseDTO marcarComoEnviada(CompraId compraId, String infoEnvio);

    CompraResponseDTO marcarComoEntregada(CompraId compraId);

    CompraResponseDTO cancelarCompra(CompraId compraId, String motivo);
}
