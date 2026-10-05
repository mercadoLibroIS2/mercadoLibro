package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Response.MovimientoPuntosResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.SaldoPuntosResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;

import java.util.List;

public interface MovimientoPuntosService {

    void asignarPuntosIniciales(Usuario usuario);

    SaldoPuntosResponseDTO obtenerSaldoActual();

    List<MovimientoPuntosResponseDTO> obtenerHistorial();
}