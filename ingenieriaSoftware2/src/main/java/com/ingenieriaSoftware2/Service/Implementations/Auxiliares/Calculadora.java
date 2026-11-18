package com.ingenieriaSoftware2.Service.Implementations.Auxiliares;

import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Enums.ColorSemaforo;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Exception.Libro.LibroNoExisteException;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;


@Component
public class Calculadora {

    @Autowired
    private LibroRepository libroRepository;

    public Integer calcular(String isbn, EstadoFisico estadoFisico) {
        Libro libro = libroRepository.findById(isbn)
                .orElseThrow(() -> new LibroNoExisteException());

        if (estadoFisico == null) {
            return null;
        }

        return PoliticaPuntos.referencia(libro, estadoFisico);
    }

    public double factorPorEstado(EstadoFisico estadoFisico) {
        return PoliticaPuntos.factorPorEstado(estadoFisico);
    }

    public ColorSemaforo calculadoraColor(Integer valorSolicitado, Integer valorReferencia) {
        return PoliticaPuntos.color(valorSolicitado, valorReferencia);
    }
}
