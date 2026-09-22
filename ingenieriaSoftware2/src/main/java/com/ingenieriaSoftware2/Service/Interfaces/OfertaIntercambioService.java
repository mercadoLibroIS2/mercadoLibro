package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.Entity.Intercambio;

public interface OfertaIntercambioService {
    Intercambio solicitarPorPuntos(String solicitanteId, String libroSolicitadoId, Integer puntosOfrecidos);
    Intercambio solicitarDirecto(String solicitanteId, String libroSolicitadoId, String libroOfrecidoId);

}
