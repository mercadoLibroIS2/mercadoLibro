package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.Entity.Categoria;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Exception.Libro.LibroNoExisteException;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Service.Implementations.Auxiliares.Calculadora;
import com.ingenieriaSoftware2.Service.Interfaces.LibroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
public class LibroServiceImpl implements LibroService {
    @Autowired
    private LibroRepository libroRepository;
    @Autowired
    private Calculadora calculadora;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerReferencia(String isbn, EstadoFisico estadoFisico) {
        Libro libro = libroRepository.findByIsbn(isbn).orElseThrow(LibroNoExisteException::new);
        Map<String, Object> body = new HashMap<>();
        body.put("valorReferencia", calculadora.calcular(libro.getIsbn(), estadoFisico));
        body.put("categoria", libro.getCategorias().stream()
                .map(Categoria::getNombre)
                .sorted()
                .findFirst()
                .orElse(null));
        return body;
    }
}
