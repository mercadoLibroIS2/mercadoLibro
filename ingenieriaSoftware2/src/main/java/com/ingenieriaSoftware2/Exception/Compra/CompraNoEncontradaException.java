package com.ingenieriaSoftware2.Exception.Compra;

public class CompraNoEncontradaException extends RuntimeException {
    public CompraNoEncontradaException() {
        super("La compra no ha sido encontrada.");
    }
}
