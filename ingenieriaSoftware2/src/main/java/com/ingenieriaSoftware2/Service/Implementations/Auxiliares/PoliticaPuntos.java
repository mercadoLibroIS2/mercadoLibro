package com.ingenieriaSoftware2.Service.Implementations.Auxiliares;

import com.ingenieriaSoftware2.Entity.Libro;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Enums.ColorSemaforo;

/** Escala vigente. Los precios solicitados y movimientos históricos no se reescriben. */
public final class PoliticaPuntos {
    public static final int PUNTOS_INICIALES = 500;
    public static final int BONO_TRUEQUE = 50;
    public static final int BONO_RESENIA = 25;
    public static final int BONO_CADENA = 50;
    public static final int REFERENCIA_NUEVO = 500;
    public static final String SIN_CLASIFICAR = "Sin clasificar";

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
        double valor = basePorCategoria(categoria(libro)) * factorPaginas(libro.getPaginas()) * factorPorEstado(estado);
        return (int) Math.max(5, Math.round(valor / 5.0) * 5);
    }

    public static double factorPaginas(Integer paginas) {
        if (paginas == null || paginas <= 0) return 1.0;
        return Math.max(0.85, Math.min(1.15, 1 + (paginas - 300) / 2000.0));
    }

    public static int basePorCategoria(String categoria) {
        return switch (categoria) {
            case "Infantil" -> 350;
            case "Poesía" -> 400;
            case "Ciencia" -> 550;
            case "Técnico" -> 650;
            default -> REFERENCIA_NUEVO;
        };
    }

    public static String categoria(Libro libro) {
        if (libro == null) return SIN_CLASIFICAR;
        if (libro.getCategoriaReferencia() != null) return libro.getCategoriaReferencia();
        return normalizarCategorias(libro.getCategorias().stream().map(c -> c.getNombre()).sorted().toList());
    }

    public static String normalizarCategorias(List<String> categorias) {
        if (categorias == null) return SIN_CLASIFICAR;
        for (String raw : categorias) {
            if (raw == null) continue;
            String texto = Normalizer.normalize(raw, Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
            if (texto.matches(".*(juvenile|children|infantil|juvenil).*")) return "Infantil";
            if (texto.matches(".*(comic|graphic novel|novela grafica).*")) return "Comics y novela gráfica";
            if (texto.matches(".*(computer|technolog|engineering|tecnic|academi|textbook).*")) return "Técnico";
            if (texto.matches(".*(science|mathemat|nature|ciencia|divulgacion).*")) return "Ciencia";
            if (texto.matches(".*(poetry|poesia).*")) return "Poesía";
            if (texto.matches(".*(biograph|biografia).*")) return "Biografía";
            if (texto.contains("histor")) return "Historia";
            if (texto.matches(".*(philosoph|filosofia).*")) return "Filosofía";
            if (texto.matches(".*(self.help|autoayuda).*")) return "Autoayuda";
            if (texto.matches(".*(non.?fiction|no ficcion).*")) return "No ficción";
            if (texto.matches(".*(fiction|ficcion|novela).*")) return "Ficción";
        }
        return SIN_CLASIFICAR;
    }

    public static ColorSemaforo color(Integer solicitado, Integer referencia) {
        if (solicitado == null || referencia == null || referencia <= 0) return ColorSemaforo.SIN_REFERENCIA;
        double ratio = (double) solicitado / referencia;
        if (ratio <= 1.10) return ColorSemaforo.VERDE;
        if (ratio <= 1.30) return ColorSemaforo.AMARILLO;
        return ColorSemaforo.ROJO;
    }
}
