package com.ingenieriaSoftware2.Exception.Resenia;

public class ReseniaIntercambioIncompletoException extends RuntimeException {
    public ReseniaIntercambioIncompletoException() {
        super("El intercambio aún no está completado para reseñar.");
    }
}
