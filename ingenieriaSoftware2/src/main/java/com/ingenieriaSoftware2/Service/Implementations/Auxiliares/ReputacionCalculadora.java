package com.ingenieriaSoftware2.Service.Implementations.Auxiliares;

import com.ingenieriaSoftware2.Entity.Resenia;
import com.ingenieriaSoftware2.Entity.ReseniaCompra;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Repository.ReseniaCompraRepository;
import com.ingenieriaSoftware2.Repository.ReseniaRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.stream.IntStream;
import java.util.stream.Stream;

/** Reputación = promedio de todas las reseñas recibidas, de trueques y de compras. */
@Component
public class ReputacionCalculadora {

    @Autowired
    private ReseniaRepository reseniaRepository;
    @Autowired
    private ReseniaCompraRepository reseniaCompraRepository;
    @Autowired
    private UsuarioRepository usuarioRepository;

    public void recalcular(Usuario evaluado) {
        String email = evaluado.getEmail();
        IntStream calificaciones = Stream.concat(
                reseniaRepository.listarRecibidasPorEmail(email).stream().map(Resenia::getCalificacion),
                reseniaCompraRepository.listarRecibidasPorEmail(email).stream().map(ReseniaCompra::getCalificacion)
        ).mapToInt(Short::intValue);
        double promedio = calificaciones.average().orElse(0);
        evaluado.setReputacionPromedio((float) promedio);
        usuarioRepository.save(evaluado);
    }
}
