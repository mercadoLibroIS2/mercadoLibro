package com.ingenieriaSoftware2.Exception.Resenia;

public class NoInvolucradoException extends RuntimeException {
    public NoInvolucradoException() {
        super("Solo las partes del intercambio pueden reseñarlo");
    }
}
