package com.ingenieriaSoftware2.Exception.Notificacion;

public class NotificacionNoEncontradaException extends RuntimeException {
    public NotificacionNoEncontradaException() {
      super("La notificacion no ha sido encontrada.");
    }
}
