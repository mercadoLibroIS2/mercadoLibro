package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.PublicacionRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.PublicacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Exception.Intercambio.AccionNoPermitidaException;
import com.ingenieriaSoftware2.Exception.Libro.LibroNoExisteException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoDisponibleException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoExisteException;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.PublicacionMapper;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Repository.PublicacionRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Implementations.Auxiliares.Calculadora;
import com.ingenieriaSoftware2.Service.Interfaces.PublicacionService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class PublicacionServiceImpl implements PublicacionService {

    private static final List<EstadoIntercambio> ESTADOS_INTERCAMBIO_ACTIVOS = List.of(
            EstadoIntercambio.PENDIENTE,
            EstadoIntercambio.ACEPTADO,
            EstadoIntercambio.CONFIRMADO_POR_PROPONENTE,
            EstadoIntercambio.CONFIRMADO_POR_RECEPTOR);

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private PublicacionMapper publicacionMapper;

    @Autowired
    private Calculadora calculadora;

    @Autowired
    private LibroRepository libroRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private IntercambioRepository intercambioRepository;

    @Override
    @Transactional
    public PublicacionResponseDTO publicarLibro(PublicacionRequestDTO request, String email) {
        Usuario propietario = usuarioRepository.findByEmail(email).orElseThrow(() -> new UsuarioNoEncontrado());
        Libro libro = libroRepository.findByIsbn(request.isbn()).orElseThrow(() -> new LibroNoExisteException());

        // Postgres guarda microsegundos: si no se trunca, la hora que devuelve la API
        // no coincide con la guardada y la publicación no se encuentra después
        LocalDateTime hora = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);

        Publicacion publicacion = new Publicacion();
        publicacion.setId(new PublicacionId(libro.getIsbn(), propietario.getEmail(), hora));
        publicacion.setLibro(libro);              // lo necesita @MapsId("isbn")
        publicacion.setPropietario(propietario);  // evita NPE en los mappers
        publicacion.setEstadoFisico(request.estadoFisico());
        publicacion.setValorPuntosSolicitado(request.valorPuntosSolicitado());
        publicacion.setComentario(request.comentario());
        publicacion.setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);

        Integer valorRef = calculadora.calcular(libro.getIsbn(), request.estadoFisico());
        publicacion.setValorReferenciaCalculado(valorRef);
        publicacion.setColorSemaforo(calculadora.calculadoraColor(request.valorPuntosSolicitado(), valorRef));

        return publicacionMapper.toDTO(publicacionRepository.save(publicacion));
    }

    @Override
    @Transactional
    public PublicacionResponseDTO verDetallesPublicacion(PublicacionId id) {
        Publicacion publicacion = publicacionRepository.findById(id).orElseThrow(() -> new PublicacionNoExisteException());
        return publicacionMapper.toDTO(publicacion);
    }

    @Override
    @Transactional
    public void editarPublicacion(PublicacionId id, PublicacionRequestDTO dto, String emailUsuario) {
        if (!id.getEmailPropietario().equals(emailUsuario)) {
            throw new AccionNoPermitidaException("Solo el dueño puede editar la publicación");
        }

        Publicacion publicacion = publicacionRepository.findByIdParaActualizar(id)
                .orElseThrow(() -> new PublicacionNoExisteException());

        boolean tieneIntercambioActivo = intercambioRepository.existeIntercambioActivo(
                id.getIsbn(), id.getEmailPropietario(), id.getHoraPublicacion(), ESTADOS_INTERCAMBIO_ACTIVOS);

        if (publicacion.getEstadoPublicacion() != EstadoPublicacion.DISPONIBLE || tieneIntercambioActivo) {
            throw new PublicacionNoDisponibleException();
        }

        // El ISBN no se modifica: es parte de la clave primaria
        publicacion.setEstadoFisico(dto.estadoFisico());
        publicacion.setComentario(dto.comentario());
        publicacion.setValorPuntosSolicitado(dto.valorPuntosSolicitado());

        Integer valorRef = calculadora.calcular(id.getIsbn(), dto.estadoFisico());
        publicacion.setValorReferenciaCalculado(valorRef);
        publicacion.setColorSemaforo(calculadora.calculadoraColor(dto.valorPuntosSolicitado(), valorRef));
    }
}
