package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.IntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.IntercambioResponseDTO;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.IntercambioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class IntercambioServiceImpl implements IntercambioService {
    @Autowired
    private IntercambioRepository intercambioRepository;

    @Override
    public IntercambioResponseDTO proponerIntercambio(IntercambioRequestDTO request, Long usuarioProponenteId) {
        return null;
    }

    @Override
    public IntercambioResponseDTO obtenerPorId(Long intercambioId) {
        return null;
    }

    @Override
    public List<IntercambioResponseDTO> listarPropuestasRecibidas(Long usuarioId) {
        return List.of();
    }

    @Override
    public List<IntercambioResponseDTO> listarPropuestasEnviadas(Long usuarioId) {
        return List.of();
    }

    @Override
    public IntercambioResponseDTO aceptarIntercambio(Long intercambioId, Long usuarioReceptorId) {
        return null;
    }

    @Override
    public IntercambioResponseDTO rechazarIntercambio(Long intercambioId, Long usuarioReceptorId, String motivo) {
        return null;
    }

    @Override
    public IntercambioResponseDTO cancelarIntercambio(Long intercambioId, Long usuarioId) {
        return null;
    }

    @Override
    public IntercambioResponseDTO completarIntercambio(Long intercambioId) {
        return null;
    }

    @Override
    public EstadoIntercambio consultarEstado(Long intercambioId) {
        return null;
    }
}
