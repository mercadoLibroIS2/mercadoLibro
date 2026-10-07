package com.ingenieriaSoftware2.Exception.Publicacion;

public class PublicacionNoDisponibleException extends RuntimeException {
    public PublicacionNoDisponibleException() {

      super("La publicacion no esta disponible.");
    }
}
