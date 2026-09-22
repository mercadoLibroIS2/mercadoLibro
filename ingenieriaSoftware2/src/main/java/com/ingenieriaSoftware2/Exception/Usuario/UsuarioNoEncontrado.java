package com.ingenieriaSoftware2.Exception.Usuario;

public class UsuarioNoEncontrado extends RuntimeException {
    public UsuarioNoEncontrado() {

      super("El usuario no ha sido encontrado.");
    }
}
