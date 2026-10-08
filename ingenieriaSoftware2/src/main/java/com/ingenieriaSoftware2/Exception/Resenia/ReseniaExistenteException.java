package com.ingenieriaSoftware2.Exception.Resenia;

public class ReseniaExistenteException extends RuntimeException {
    public ReseniaExistenteException() {
        super("Ya existe una reseña para este intercambio por ese usuario.");
    }
}
