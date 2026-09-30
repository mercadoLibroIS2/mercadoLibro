package com.ingenieriaSoftware2.Service.Implementations.Auxiliares;

import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Exception.Libro.LibroNoExisteException;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;


@Component
public class Calculadora {
    @Autowired
    private LibroRepository libroRepository;
    public Integer calcular (String isbn, EstadoFisico estadoFisico){
        Libro libro = libroRepository.findById(isbn).orElseThrow(() -> new LibroNoExisteException());
        Integer valorBase = libro.getValorReferencia();
        return (int)Math.round(valorBase*factorPorEstado(estadoFisico));
    }

    public float factorPorEstado(EstadoFisico estadoFisico){
        return (float) switch (estadoFisico){
            case NUEVO -> 1.0;
            case COMO_NUEVO -> 0.9;
            case BUEN_ESTADO -> 0.8;
            case ACEPTABLE -> 0.65;
            case DETERIORADO -> 0.45;
        };
    }
}
