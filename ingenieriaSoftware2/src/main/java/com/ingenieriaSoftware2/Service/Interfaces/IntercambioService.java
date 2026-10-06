package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.IntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.IntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;

import java.util.List;
import java.util.UUID;

public interface IntercambioService {

    IntercambioResponseDTO proponerIntercambio(IntercambioRequestDTO request, UUID usuarioProponenteId);

    IntercambioResponseDTO obtenerPorId(IntercambioId intercambioId);

    List<IntercambioResponseDTO> listarPropuestasEnviadas(UUID usuarioId);

    List<IntercambioResponseDTO> listarPropuestasRecibidas(UUID usuarioId);

    IntercambioResponseDTO aceptarIntercambio(IntercambioId intercambioId, UUID usuarioReceptorId);

    IntercambioResponseDTO rechazarIntercambio(IntercambioId intercambioId, UUID usuarioReceptorId, String motivo);

    IntercambioResponseDTO cancelarIntercambio(IntercambioId intercambioId, UUID usuarioId);

    IntercambioResponseDTO completarIntercambio(IntercambioId intercambioId, UUID usuarioId);

    EstadoIntercambio consultarEstado(IntercambioId intercambioId);

    void cancelarPendientesDePublicacion(PublicacionId publicacionId, IntercambioId excluir);
}