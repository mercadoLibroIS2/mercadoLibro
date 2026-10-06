package com.ingenieriaSoftware2.Service.Implementations.Auxiliares;

import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Enums.ColorSemaforo;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Exception.Libro.LibroNoExisteException;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import static com.ingenieriaSoftware2.Enums.ColorSemaforo.*;

@Component
public class Calculadora {

    private static final double LIMITE_VERDE = 1.10;
    private static final double LIMITE_AMARILLO = 1.30;

    @Autowired
    private LibroRepository libroRepository;

    public Integer calcular(String isbn, EstadoFisico estadoFisico) {
        Libro libro = libroRepository.findById(isbn)
                .orElseThrow(() -> new LibroNoExisteException());

        Integer valorBase = libro.getValorReferencia();
        if (valorBase == null || estadoFisico == null) {
            return null;
        }

        return (int) Math.round(valorBase * factorPorEstado(estadoFisico));
    }

    public double factorPorEstado(EstadoFisico estadoFisico) {
        return switch (estadoFisico) {
            case NUEVO -> 1.0;
            case COMO_NUEVO -> 0.9;
            case BUEN_ESTADO -> 0.8;
            case ACEPTABLE -> 0.65;
            case DETERIORADO -> 0.45;
        };
    }

    public ColorSemaforo calculadoraColor(Integer valorSolicitado, Integer valorReferencia) {
        if (valorSolicitado == null || valorReferencia == null || valorReferencia <= 0) {
            return SIN_REFERENCIA;
        }

        double ratio = (double) valorSolicitado / valorReferencia;

        if (ratio <= LIMITE_VERDE) return VERDE;
        if (ratio <= LIMITE_AMARILLO) return AMARILLO;
        return ROJO;
    }
}