package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Response.MovimientoPuntosResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.SaldoPuntosResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;

import java.util.List;

public interface MovimientoPuntosService {

    void asignarPuntosIniciales(Usuario usuario);

    /** Acredita una bonificación del sistema (p. ej. completar una cadena) y la registra en el historial. */
    void acreditarBonificacionSistema(Usuario usuario, int monto, String descripcion);

    SaldoPuntosResponseDTO obtenerSaldoActual();

    List<MovimientoPuntosResponseDTO> obtenerHistorial();
}