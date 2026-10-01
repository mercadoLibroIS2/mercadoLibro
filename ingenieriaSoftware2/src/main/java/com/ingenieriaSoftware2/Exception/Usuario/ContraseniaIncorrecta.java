package com.ingenieriaSoftware2.Exception.Usuario;

public class ContraseniaIncorrecta extends RuntimeException {
    public ContraseniaIncorrecta() {
        super("La contraseña actual no es correcta");
    }
}
