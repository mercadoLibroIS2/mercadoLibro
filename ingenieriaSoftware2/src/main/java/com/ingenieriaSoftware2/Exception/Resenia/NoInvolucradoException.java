package com.ingenieriaSoftware2.Exception.Resenia;

public class NoInvolucradoException extends RuntimeException {
    public NoInvolucradoException() {
        super("El usuario no participa en este intercambio.");
    }
}
