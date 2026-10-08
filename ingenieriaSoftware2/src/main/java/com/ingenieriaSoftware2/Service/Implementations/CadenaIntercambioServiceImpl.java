package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.CadenaIntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.PasoCadenaResponseDTO;
import com.ingenieriaSoftware2.Entity.CadenaIntercambio;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCadena;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Repository.CadenaIntercambioRepository;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Repository.PublicacionRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.CadenaIntercambioService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CadenaIntercambioServiceImpl implements CadenaIntercambioService {

    @Autowired
    private CadenaIntercambioRepository cadenaIntercambioRepository;

    @Autowired
    private IntercambioRepository intercambioRepository;

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private LibroMapper libroMapper;

    @Override
    public List<CadenaIntercambioResponseDTO> obtenerCadenasDeUsuario(UUID usuarioId) {
        List<CadenaIntercambio> cadenas = cadenaIntercambioRepository.findByParticipanteId(usuarioId);
        return cadenas.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public CadenaIntercambioResponseDTO obtenerCadenaPorId(UUID cadenaId) {
        CadenaIntercambio cadena = cadenaIntercambioRepository.findById(cadenaId)
                .orElseThrow(() -> new IllegalArgumentException("Cadena no encontrada con id: " + cadenaId));
        return toResponseDTO(cadena);
    }

    @Override
    @Transactional
    public CadenaIntercambioResponseDTO confirmarPaso(UUID cadenaId, UUID usuarioId) {
        CadenaIntercambio cadena = cadenaIntercambioRepository.findById(cadenaId)
                .orElseThrow(() -> new IllegalArgumentException("Cadena no encontrada con id: " + cadenaId));

        if (cadena.getEstado() == EstadoCadena.CANCELADA || cadena.getEstado() == EstadoCadena.COMPLETADA) {
            throw new IllegalStateException("No se puede confirmar un paso en una cadena " + cadena.getEstado());
        }

        // Buscar el intercambio correspondiente al participante que entrega
        boolean encontrado = false;
        for (Intercambio intercambio : cadena.getIntercambios()) {
            if (intercambio.getPublicacionOfrecida() != null &&
                intercambio.getPublicacionOfrecida().getPropietario() != null &&
                intercambio.getPublicacionOfrecida().getPropietario().getId().equals(usuarioId)) {
                intercambio.setEstado(EstadoIntercambio.ACEPTADO);
                intercambioRepository.save(intercambio);
                encontrado = true;
                break;
            }
        }

        if (!encontrado) {
            throw new IllegalArgumentException("El usuario no es un participante que entrega en esta cadena");
        }

        // Verificar si todos los intercambios están aceptados
        boolean todosAceptados = !cadena.getIntercambios().isEmpty() &&
                cadena.getIntercambios().stream()
                        .allMatch(i -> i.getEstado() == EstadoIntercambio.ACEPTADO || i.getEstado() == EstadoIntercambio.COMPLETADO);

        if (todosAceptados) {
            cadena.setEstado(EstadoCadena.COMPLETADA);

            // Marcar intercambios como completados y actualizar estado de publicaciones
            for (Intercambio i : cadena.getIntercambios()) {
                i.setEstado(EstadoIntercambio.COMPLETADO);
                if (i.getPublicacionSolicitante() != null) {
                    i.getPublicacionSolicitante().setEstadoPublicacion(EstadoPublicacion.VENDIDA);
                    publicacionRepository.save(i.getPublicacionSolicitante());
                }
                if (i.getPublicacionOfrecida() != null) {
                    i.getPublicacionOfrecida().setEstadoPublicacion(EstadoPublicacion.VENDIDA);
                    publicacionRepository.save(i.getPublicacionOfrecida());
                }
            }

            // Acreditar puntos bonus si corresponde
            if (cadena.getPuntosBonus() != null && cadena.getPuntosBonus() > 0) {
                for (Usuario participante : cadena.getParticipantes()) {
                    participante.setSaldoTotal((participante.getSaldoTotal() != null ? participante.getSaldoTotal() : 0) + cadena.getPuntosBonus());
                    usuarioRepository.save(participante);
                }
            }
        } else {
            cadena.setEstado(EstadoCadena.EN_CURSO);
        }

        CadenaIntercambio guardada = cadenaIntercambioRepository.save(cadena);
        return toResponseDTO(guardada);
    }

    @Override
    @Transactional
    public CadenaIntercambioResponseDTO rechazarCadena(UUID cadenaId, UUID usuarioId) {
        CadenaIntercambio cadena = cadenaIntercambioRepository.findById(cadenaId)
                .orElseThrow(() -> new IllegalArgumentException("Cadena no encontrada con id: " + cadenaId));

        if (cadena.getEstado() == EstadoCadena.COMPLETADA || cadena.getEstado() == EstadoCadena.CANCELADA) {
            throw new IllegalStateException("No se puede rechazar una cadena " + cadena.getEstado());
        }

        boolean esParticipante = cadena.getParticipantes() != null &&
                cadena.getParticipantes().stream().anyMatch(u -> u.getId().equals(usuarioId));
        if (!esParticipante) {
            throw new IllegalArgumentException("El usuario no pertenece a la cadena");
        }

        cadena.setEstado(EstadoCadena.CANCELADA);

        for (Intercambio i : cadena.getIntercambios()) {
            i.setEstado(EstadoIntercambio.RECHAZADO);
            if (i.getPublicacionSolicitante() != null) {
                i.getPublicacionSolicitante().setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);
                publicacionRepository.save(i.getPublicacionSolicitante());
            }
            if (i.getPublicacionOfrecida() != null) {
                i.getPublicacionOfrecida().setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);
                publicacionRepository.save(i.getPublicacionOfrecida());
            }
            intercambioRepository.save(i);
        }

        CadenaIntercambio guardada = cadenaIntercambioRepository.save(cadena);
        return toResponseDTO(guardada);
    }

    @Override
    @Transactional
    public CadenaIntercambioResponseDTO crearCadena(CadenaIntercambioRequestDTO request) {
        CadenaIntercambio cadena = new CadenaIntercambio();
        cadena.setEstado(EstadoCadena.PROPUESTA);
        cadena.setPuntosBonus(request.puntosBonus() != null ? request.puntosBonus() : 10);

        Set<Usuario> participantes = new HashSet<>();
        List<Intercambio> intercambios = new ArrayList<>();

        cadena.setIntercambios(intercambios);
        cadena.setParticipantes(participantes);

        CadenaIntercambio guardada = cadenaIntercambioRepository.save(cadena);
        return toResponseDTO(guardada);
    }

    private CadenaIntercambioResponseDTO toResponseDTO(CadenaIntercambio cadena) {
        List<PasoCadenaResponseDTO> pasos = new ArrayList<>();

        if (cadena.getParticipantes() != null) {
            for (Usuario participante : cadena.getParticipantes()) {
                Intercambio intercambioEntrega = (cadena.getIntercambios() != null) ? cadena.getIntercambios().stream()
                        .filter(i -> i.getPublicacionOfrecida() != null &&
                                     i.getPublicacionOfrecida().getPropietario() != null &&
                                     i.getPublicacionOfrecida().getPropietario().getId().equals(participante.getId()))
                        .findFirst()
                        .orElse(null) : null;

                Intercambio intercambioRecibe = (cadena.getIntercambios() != null) ? cadena.getIntercambios().stream()
                        .filter(i -> i.getPublicacionSolicitante() != null &&
                                     i.getPublicacionSolicitante().getPropietario() != null &&
                                     i.getPublicacionSolicitante().getPropietario().getId().equals(participante.getId()))
                        .findFirst()
                        .orElse(null) : null;

                LibroResponseDTO libroEntrega = null;
                boolean confirmado = false;
                String intercambioId = null;

                if (intercambioEntrega != null) {
                    if (intercambioEntrega.getPublicacionOfrecida() != null && intercambioEntrega.getPublicacionOfrecida().getLibro() != null) {
                        libroEntrega = libroMapper.toDTO(intercambioEntrega.getPublicacionOfrecida().getLibro());
                    }
                    confirmado = (intercambioEntrega.getEstado() == EstadoIntercambio.ACEPTADO ||
                            intercambioEntrega.getEstado() == EstadoIntercambio.COMPLETADO);
                    intercambioId = intercambioEntrega.getId() != null ? intercambioEntrega.getId().toString() : null;
                }

                LibroResponseDTO libroRecibe = null;
                if (intercambioRecibe != null && intercambioRecibe.getPublicacionSolicitante() != null && intercambioRecibe.getPublicacionSolicitante().getLibro() != null) {
                    libroRecibe = libroMapper.toDTO(intercambioRecibe.getPublicacionSolicitante().getLibro());
                }

                pasos.add(new PasoCadenaResponseDTO(
                        participante.getId(),
                        participante.getNombre(),
                        participante.getEmail(),
                        libroEntrega,
                        libroRecibe,
                        confirmado,
                        intercambioId
                ));
            }
        }

        return new CadenaIntercambioResponseDTO(
                cadena.getId(),
                cadena.getEstado(),
                cadena.getPuntosBonus(),
                pasos,
                cadena.getParticipantes() != null ? cadena.getParticipantes().size() : 0
        );
    }
}
