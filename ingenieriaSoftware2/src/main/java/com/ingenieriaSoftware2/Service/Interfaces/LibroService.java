package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.Enums.EstadoFisico;

import java.util.Map;

public interface LibroService {

    /**
     * Valor de referencia que se usará para el semáforo si se publica el libro en ese estado y la
     * categoría que ya tiene asignada. Lanza LibroNoExisteException si el libro no está en la base.
     */
    Map<String, Object> obtenerReferencia(String isbn, EstadoFisico estadoFisico);
}
