package com.ingenieriaSoftware2.Exception.Resenia;

public class ReseniaExistenteException extends RuntimeException {
    public ReseniaExistenteException() {

        super("Ya dejaste una reseña para este intercambio");
    }
}
