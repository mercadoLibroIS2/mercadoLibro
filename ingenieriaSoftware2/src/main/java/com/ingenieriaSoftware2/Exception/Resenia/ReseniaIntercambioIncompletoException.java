package com.ingenieriaSoftware2.Exception.Resenia;

public class ReseniaIntercambioIncompletoException extends RuntimeException {
    public ReseniaIntercambioIncompletoException() {
        super("Solo se puede reseñar un intercambio completado");
    }
}
