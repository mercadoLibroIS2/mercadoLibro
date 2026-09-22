package com.ingenieriaSoftware2.Exception.Usuario;

public class UsuarioNoAutenticadoException extends RuntimeException {
    public UsuarioNoAutenticadoException() {

        super("Usuario no autenticado");
    }
}
