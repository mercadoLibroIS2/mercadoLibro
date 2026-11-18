package com.ingenieriaSoftware2.Service.Implementations.Auxiliares;

import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Enums.ColorSemaforo;

/** Escala vigente. Los precios solicitados y movimientos históricos no se reescriben. */
public final class PoliticaPuntos {
    public static final int PUNTOS_INICIALES = 500;
    public static final int BONO_TRUEQUE = 50;
    public static final int BONO_RESENIA = 25;
    public static final int BONO_CADENA = 50;
    public static final int REFERENCIA_BUEN_ESTADO = 500;
    public static final double VALORACION_NEUTRA = 4.0;

    private PoliticaPuntos() {}

    public static double factorPorEstado(EstadoFisico estado) {
        return switch (estado) {
            case NUEVO -> 1.0;
            case COMO_NUEVO -> 0.9;
            case BUEN_ESTADO -> 0.8;
            case ACEPTABLE -> 0.65;
            case DETERIORADO -> 0.45;
        };
    }

    public static Integer referencia(Libro libro, EstadoFisico estado) {
        if (libro == null || estado == null) return null;
        double rating = libro.getPuntuacionExterna() != null
                ? libro.getPuntuacionExterna().doubleValue() : VALORACION_NEUTRA;
        rating = Math.max(0, Math.min(5, rating));
        // 500 en buen estado a valoración 4/5; cada estrella modifica un 5 %.
        // Se calcula desde los metadatos, nunca desde cachés de la escala anterior.
        double baseNuevo = REFERENCIA_BUEN_ESTADO / factorPorEstado(EstadoFisico.BUEN_ESTADO);
        double valor = baseNuevo * (1 + (rating - VALORACION_NEUTRA) * 0.05) * factorPorEstado(estado);
        return (int) Math.max(5, Math.round(valor / 5.0) * 5);
    }

    public static ColorSemaforo color(Integer solicitado, Integer referencia) {
        if (solicitado == null || referencia == null || referencia <= 0) return ColorSemaforo.SIN_REFERENCIA;
        double ratio = (double) solicitado / referencia;
        if (ratio <= 1.10) return ColorSemaforo.VERDE;
        if (ratio <= 1.30) return ColorSemaforo.AMARILLO;
        return ColorSemaforo.ROJO;
    }
}
