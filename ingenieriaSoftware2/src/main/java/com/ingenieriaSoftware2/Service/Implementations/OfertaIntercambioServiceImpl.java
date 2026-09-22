package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Repository.OfertaIntercambioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.OfertaIntercambioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class OfertaIntercambioServiceImpl implements OfertaIntercambioService {
    @Autowired
    private OfertaIntercambioRepository ofertaIntercambioRepository;

    @Override
    public Intercambio solicitarPorPuntos(String solicitanteId, String libroSolicitadoId, Integer puntosOfrecidos) {
        return null;
    }

    @Override
    public Intercambio solicitarDirecto(String solicitanteId, String libroSolicitadoId, String libroOfrecidoId) {
        return null;
    }
}
