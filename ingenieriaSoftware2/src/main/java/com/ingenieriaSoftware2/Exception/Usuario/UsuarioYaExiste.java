package com.ingenieriaSoftware2.Exception.Usuario;

public class UsuarioYaExiste extends RuntimeException {
    public UsuarioYaExiste() {
        super("El usuario ya existe.");
    }
}
