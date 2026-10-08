package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.CompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CompraResponseDTO;

import java.util.List;

public interface CompraService {
    // Alta de una compra sobre un libro publicado
    CompraResponseDTO realizarCompra(CompraRequestDTO request, Long compradorId);

    CompraResponseDTO obtenerPorId(Long compraId);

    List<CompraResponseDTO> listarPorComprador(Long compradorId);

    List<CompraResponseDTO> listarPorVendedor(Long vendedorId);

    // Transiciones de estado del flujo de compra
    CompraResponseDTO confirmarPago(Long compraId);

    CompraResponseDTO marcarComoEnviada(Long compraId, String infoEnvio);

    CompraResponseDTO marcarComoEntregada(Long compraId);

    CompraResponseDTO cancelarCompra(Long compraId, String motivo);
}
