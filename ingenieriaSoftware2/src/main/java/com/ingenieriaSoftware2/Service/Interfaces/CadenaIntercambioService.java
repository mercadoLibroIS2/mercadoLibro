package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.CadenaIntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;

import java.util.List;
import java.util.UUID;

public interface CadenaIntercambioService {
    List<CadenaIntercambioResponseDTO> obtenerCadenasDeUsuario(UUID usuarioId);
    CadenaIntercambioResponseDTO obtenerCadenaPorId(UUID cadenaId);
    CadenaIntercambioResponseDTO confirmarPaso(UUID cadenaId, UUID usuarioId);
    CadenaIntercambioResponseDTO rechazarCadena(UUID cadenaId, UUID usuarioId);
    CadenaIntercambioResponseDTO crearCadena(CadenaIntercambioRequestDTO request);
}
