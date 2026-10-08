package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.IntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.IntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;

import java.util.List;

public interface IntercambioService {
    IntercambioResponseDTO proponerIntercambio(IntercambioRequestDTO request, Long usuarioProponenteId);

    IntercambioResponseDTO obtenerPorId(Long intercambioId);

    List<IntercambioResponseDTO> listarPropuestasRecibidas(Long usuarioId);

    List<IntercambioResponseDTO> listarPropuestasEnviadas(Long usuarioId);

    IntercambioResponseDTO aceptarIntercambio(Long intercambioId, Long usuarioReceptorId);

    IntercambioResponseDTO rechazarIntercambio(Long intercambioId, Long usuarioReceptorId, String motivo);

    IntercambioResponseDTO cancelarIntercambio(Long intercambioId, Long usuarioId);

    IntercambioResponseDTO completarIntercambio(Long intercambioId);

    EstadoIntercambio consultarEstado(Long intercambioId);

}
