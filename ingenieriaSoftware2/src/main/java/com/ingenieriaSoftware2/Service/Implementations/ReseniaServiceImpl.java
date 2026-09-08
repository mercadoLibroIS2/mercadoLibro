package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Response.ReseniaResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.MovimientoPuntos;
import com.ingenieriaSoftware2.Entity.Resenia;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.TipoMovimiento;
import com.ingenieriaSoftware2.Exception.AtributoFueraDeRangoException;
import com.ingenieriaSoftware2.Exception.Intercambio.IntercambioNoExiste;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.ReseniaMapper;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Repository.MovimientoPuntosRepository;
import com.ingenieriaSoftware2.Repository.ReseniaRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.ReseniaService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class ReseniaServiceImpl implements ReseniaService {
    @Autowired
    private ReseniaRepository reseniaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private IntercambioRepository intercambioRepository;

    @Autowired
    private MovimientoPuntosRepository movimientoPuntosRepository;

    @Autowired
    private ReseniaMapper reseniaMapper;

    private Integer puntosResenia = 50;

    @Transactional
    @Override
    public ReseniaResponseDTO crearResenia(String autorEmail, String calificadoEmail, IntercambioId intercambioId, float calificacion, String comentario, LocalDate fecha) {

        if (calificacion>5||calificacion<0||comentario.length()>500){
            throw new AtributoFueraDeRangoException();
        }

        Usuario autor = usuarioRepository.findById(autorEmail).orElseThrow(() -> new UsuarioNoEncontrado());
        Usuario calificado = usuarioRepository.findById(calificadoEmail).orElseThrow(() -> new UsuarioNoEncontrado());
        Intercambio intercambio = intercambioRepository.findById(intercambioId).orElseThrow(() -> new IntercambioNoExiste());
        boolean esValido =
                (intercambio.getSolicitante().equals(autor) && intercambio.getOfrecido().equals(calificado)) ||
                        (intercambio.getSolicitante().equals(calificado) && intercambio.getOfrecido().equals(autor));

        if (esValido) {
            Resenia resenia = new Resenia();
            resenia.setAutor(autor);
            resenia.setCalificado(calificado);
            resenia.setIntercambio(intercambio);
            resenia.setComentario(comentario);
            resenia.setCalificacion(calificacion);

            Resenia reseniaGuardada = reseniaRepository.save(resenia);

            autor.getReseniasEscritas().add(reseniaGuardada);
            calificado.getReseniasRecibidas().add(reseniaGuardada);
            MovimientoPuntos movimientoPuntos = new MovimientoPuntos();
            movimientoPuntos.setUsuario(autor);
            movimientoPuntos.setTipo(TipoMovimiento.ENTRADA);
            movimientoPuntos.setCantidad(puntosResenia);
            MovimientoPuntos movimientoPuntosGuardado = movimientoPuntosRepository.save(movimientoPuntos);

            autor.getMovimientosPuntos().add(movimientoPuntosGuardado);

            Integer puntosActuales = autor.getSaldoTotal();
            Integer puntosTotal = puntosActuales + puntosResenia;

            autor.setSaldoTotal(puntosTotal);

            Usuario autorActualizado = usuarioRepository.save(autor);

            Integer cantResenias = calificado.getReseniasRecibidas().toArray().length;
            float nuevaReputacion = (calificado.getReputacionPromedio() + calificacion) / cantResenias;

            calificado.setReputacionPromedio(nuevaReputacion);

            Usuario calificadoActualizado = usuarioRepository.save(calificado);

            return reseniaMapper.toDTO(reseniaGuardada);
        }
        throw new IntercambioNoExiste();
    }
}
