package com.ingenieriaSoftware2.Exception.Publicacion;

public class PublicacionNoExisteException extends RuntimeException {
    public PublicacionNoExisteException() {
        super("La publicacion no ha sido encontrada.");
    }
}
