package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Exception.Libro.LibroNoExisteException;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Service.Implementations.Auxiliares.Calculadora;
import com.ingenieriaSoftware2.Service.Implementations.Auxiliares.PoliticaPuntos;
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
    @Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private com.ingenieriaSoftware2.Service.Interfaces.PublicacionService publicacionService;

    @Override
    @Transactional // no readOnly: puede guardar el libro importado
    public Map<String, Object> obtenerReferencia(String isbn, EstadoFisico estadoFisico) {
        // Si el libro todavía no está en la base se importa, igual que al publicarlo: así la primera
        // publicación también tiene referencia y semáforo antes de enviarla.
        Libro libro = publicacionService != null
                ? publicacionService.obtenerOImportarLibro(isbn)
                : libroRepository.findByIsbn(isbn).orElseThrow(LibroNoExisteException::new);
        Map<String, Object> body = new HashMap<>();
        body.put("valorReferencia", calculadora.calcular(libro.getIsbn(), estadoFisico));
        body.put("categoria", PoliticaPuntos.categoria(libro));
        body.put("paginas", libro.getPaginas());
        return body;
    }
}
