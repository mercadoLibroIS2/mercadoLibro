package com.ingenieriaSoftware2.Exception.Libro;

public class LibroNoExisteException extends RuntimeException {
    public LibroNoExisteException() {
        super("El libro no existe.");
    }
}
