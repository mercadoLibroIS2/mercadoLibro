package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.IntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.IntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Exception.Intercambio.AccionNoPermitidaException;
import com.ingenieriaSoftware2.Exception.Intercambio.IntercambioNoExiste;
import com.ingenieriaSoftware2.Exception.Intercambio.EstadoIntercambioInvalidoException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoDisponibleException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoExisteException;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.IntercambioMapper;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Repository.PublicacionRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.IntercambioService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class IntercambioServiceImpl implements IntercambioService {
    @Autowired
    private IntercambioRepository intercambioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private IntercambioMapper intercambioMapper;

    @Override
    @Transactional
    public IntercambioResponseDTO proponerIntercambio(IntercambioRequestDTO request, UUID usuarioProponenteId) {
        String emailProponente = obtenerEmail(usuarioProponenteId);

        if (emailProponente.equals(request.emailPropietarioSolicitada())) {
            throw new AccionNoPermitidaException("No podés proponer un intercambio con tu propia publicación");
        }

        PublicacionId idOfrecida = new PublicacionId(
                request.isbnOfrecida(), emailProponente, request.horaPublicacionOfrecida());
        PublicacionId idSolicitada = new PublicacionId(
                request.isbnSolicitada(), request.emailPropietarioSolicitada(), request.horaPublicacionSolicitada());

        Publicacion ofrecida = publicacionRepository.findById(idOfrecida).orElseThrow(()-> new PublicacionNoExisteException());
        Publicacion solicitada = publicacionRepository.findById(idSolicitada).orElseThrow(()-> new PublicacionNoExisteException());

        validarPublicacionActiva(ofrecida);
        validarPublicacionActiva(solicitada);

        IntercambioId id = new IntercambioId(
                request.isbnSolicitada(),
                request.emailPropietarioSolicitada(),
                request.horaPublicacionSolicitada(),
                request.isbnOfrecida(),
                emailProponente,
                request.horaPublicacionOfrecida()
        );

        if (intercambioRepository.existsById(id)) {
            throw new EstadoIntercambioInvalidoException("Ya existe un intercambio entre estas publicaciones");
        }

        Intercambio intercambio = new Intercambio();
        intercambio.setId(id);
        intercambio.setPublicacionOfrecida(ofrecida);
        intercambio.setPublicacionSolicitante(solicitada);
        intercambio.setEstado(EstadoIntercambio.PENDIENTE);
        intercambio.setPuntosComprometidos(
                request.puntosComprometidos() != null ? request.puntosComprometidos() : 0);

        return intercambioMapper.toDTO(intercambioRepository.save(intercambio));
    }

    @Override
    @Transactional
    public IntercambioResponseDTO obtenerPorId(IntercambioId intercambioId) {
        return intercambioMapper.toDTO(buscarIntercambio(intercambioId));
    }

    @Override
    @Transactional
    public List<IntercambioResponseDTO> listarPropuestasEnviadas(UUID usuarioId) {
        String email = obtenerEmail(usuarioId);
        return intercambioRepository.findById_PropietarioIdOfrecida(email).stream()
                .map(intercambioMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional
    public IntercambioResponseDTO aceptarIntercambio(IntercambioId intercambioId, UUID usuarioReceptorId) {
        Intercambio intercambio = buscarIntercambio(intercambioId);
        validarEsReceptor(intercambio, usuarioReceptorId);
        validarEstado(intercambio, EstadoIntercambio.PENDIENTE);

        intercambio.setEstado(EstadoIntercambio.ACEPTADO);
        return intercambioMapper.toDTO(intercambio);
    }

    @Override
    @Transactional
    public IntercambioResponseDTO rechazarIntercambio(IntercambioId intercambioId, UUID usuarioReceptorId, String motivo) {
        Intercambio intercambio = buscarIntercambio(intercambioId);
        validarEsReceptor(intercambio, usuarioReceptorId);
        validarEstado(intercambio, EstadoIntercambio.PENDIENTE);

        intercambio.setEstado(EstadoIntercambio.RECHAZADO);
        intercambio.setMotivoRechazo(motivo);
        return intercambioMapper.toDTO(intercambio);
    }

    @Override
    @Transactional
    public IntercambioResponseDTO cancelarIntercambio(IntercambioId intercambioId, UUID usuarioId) {
        Intercambio intercambio = buscarIntercambio(intercambioId);
        validarEsParticipante(intercambio, usuarioId);
        validarEstado(intercambio, EstadoIntercambio.PENDIENTE, EstadoIntercambio.ACEPTADO);

        intercambio.setEstado(EstadoIntercambio.CANCELADO);
        return intercambioMapper.toDTO(intercambio);
    }

    @Override
    @Transactional
    public IntercambioResponseDTO completarIntercambio(IntercambioId intercambioId) {
        Intercambio intercambio = buscarIntercambio(intercambioId);
        validarEstado(intercambio, EstadoIntercambio.ACEPTADO);

        intercambio.setEstado(EstadoIntercambio.COMPLETADO);
        return intercambioMapper.toDTO(intercambio);
    }

    @Override
    @Transactional
    public EstadoIntercambio consultarEstado(IntercambioId intercambioId) {
        return buscarIntercambio(intercambioId).getEstado();
    }

    // ---------- Métodos auxiliares ----------

    private Intercambio buscarIntercambio(IntercambioId id) {
        return intercambioRepository.findById(id).orElseThrow(()-> new IntercambioNoExiste());
    }

    private String obtenerEmail(UUID usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .map(Usuario::getEmail)
                .orElseThrow(UsuarioNoEncontrado::new);
    }

    private void validarPublicacionActiva(Publicacion publicacion) {
        if (publicacion.getEstadoPublicacion() != EstadoPublicacion.DISPONIBLE) {
            throw new PublicacionNoDisponibleException();
        }
    }

    private void validarEstado(Intercambio intercambio, EstadoIntercambio... estadosPermitidos) {
        if (!Arrays.asList(estadosPermitidos).contains(intercambio.getEstado())) {
            throw new EstadoIntercambioInvalidoException("No se puede realizar esta acción con el intercambio en estado " + intercambio.getEstado());
        }
    }

    private void validarEsReceptor(Intercambio intercambio, UUID usuarioId) {
        String email = obtenerEmail(usuarioId);
        if (!intercambio.getId().getPropietarioIdSolicitante().equals(email)) {
            throw new AccionNoPermitidaException("Solo el receptor puede realizar esta acción");
        }
    }

    private void validarEsParticipante(Intercambio intercambio, UUID usuarioId) {
        String email = obtenerEmail(usuarioId);
        IntercambioId id = intercambio.getId();
        boolean esProponente = id.getPropietarioIdOfrecida().equals(email);
        boolean esReceptor = id.getPropietarioIdSolicitante().equals(email);
        if (!esProponente && !esReceptor) {
            throw new AccionNoPermitidaException("No participás en este intercambio");
        }
    }
}
