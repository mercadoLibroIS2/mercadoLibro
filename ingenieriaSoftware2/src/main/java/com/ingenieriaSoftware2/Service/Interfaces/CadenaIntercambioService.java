package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.CadenaIntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;

import java.util.List;
import java.util.UUID;

public interface CadenaIntercambioService {
    /** Detecta cadenas nuevas y devuelve aquellas en las que participa el usuario (todas si es null). */
    List<CadenaIntercambioResponseDTO> listarCadenas(UUID usuarioId);

    CadenaIntercambioResponseDTO crearCadena(CadenaIntercambioRequestDTO dto);

    CadenaIntercambioResponseDTO aceptarCadena(UUID cadenaId, UUID usuarioId);

    CadenaIntercambioResponseDTO rechazarCadena(UUID cadenaId, UUID usuarioId);
}

