package com.ingenieriaSoftware2.Exception.Intercambio;

public class IntercambioNoExiste extends RuntimeException {
    public IntercambioNoExiste() {
        super("El intercambio no existe.");
    }
}
