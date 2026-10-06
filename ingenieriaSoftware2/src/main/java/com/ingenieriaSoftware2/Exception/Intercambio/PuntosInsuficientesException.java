package com.ingenieriaSoftware2.Exception.Intercambio;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class PuntosInsuficientesException extends RuntimeException {
    public PuntosInsuficientesException(int necesarios, int disponibles) {
        super("Puntos insuficientes: se necesitan " + necesarios + " y tenés " + disponibles);
    }
}
