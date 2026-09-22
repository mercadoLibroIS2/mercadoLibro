package com.ingenieriaSoftware2.Exception;

public class AtributoFueraDeRangoException extends RuntimeException {
    public AtributoFueraDeRangoException() {
        super("Atributo fuera de rango.");
    }
}
