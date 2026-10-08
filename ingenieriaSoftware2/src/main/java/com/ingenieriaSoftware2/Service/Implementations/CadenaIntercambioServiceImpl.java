package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.CadenaIntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.PasoCadenaResponseDTO;
import com.ingenieriaSoftware2.Entity.CadenaIntercambio;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCadena;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Exception.Intercambio.IntercambioNoExiste;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Repository.CadenaIntercambioRepository;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Repository.LibroRepository;
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
    private LibroRepository libroRepository;

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

        // Buscar el intercambio correspondiente al participante
        boolean encontrado = false;
        for (Intercambio intercambio : cadena.getIntercambios()) {
            if (intercambio.getPrestador().getId().equals(usuarioId)) {
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

            // Marcar intercambios como completados y actualizar libros
            for (Intercambio i : cadena.getIntercambios()) {
                i.setEstado(EstadoIntercambio.COMPLETADO);
                if (i.getLibroDeseado() != null) {
                    i.getLibroDeseado().setDisponible(false);
                    libroRepository.save(i.getLibroDeseado());
                }
                if (i.getLibroOfrecido() != null) {
                    i.getLibroOfrecido().setDisponible(false);
                    libroRepository.save(i.getLibroOfrecido());
                }
            }

            // Acreditar puntos bonus si corresponde
            if (cadena.getPuntosBonus() != null && cadena.getPuntosBonus() > 0) {
                for (Usuario participante : cadena.getParticipantes()) {
                    participante.setSaldoTotal(participante.getSaldoTotal() + cadena.getPuntosBonus());
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

        cadena.setEstado(EstadoCadena.CANCELADA);

        for (Intercambio i : cadena.getIntercambios()) {
            i.setEstado(EstadoIntercambio.RECHAZADO);
            if (i.getLibroDeseado() != null) {
                i.getLibroDeseado().setDisponible(true);
                libroRepository.save(i.getLibroDeseado());
            }
            if (i.getLibroOfrecido() != null) {
                i.getLibroOfrecido().setDisponible(true);
                libroRepository.save(i.getLibroOfrecido());
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

        if (request.intercambioIds() != null && !request.intercambioIds().isEmpty()) {
            for (UUID intercambioId : request.intercambioIds()) {
                Intercambio intercambio = intercambioRepository.findById(intercambioId)
                        .orElseThrow(() -> new IllegalArgumentException("Intercambio no encontrado: " + intercambioId));
                intercambio.setCadena(cadena);
                intercambios.add(intercambio);
                if (intercambio.getPrestador() != null) participantes.add(intercambio.getPrestador());
                if (intercambio.getReceptor() != null) participantes.add(intercambio.getReceptor());
            }
        }

        cadena.setIntercambios(intercambios);
        cadena.setParticipantes(participantes);

        CadenaIntercambio guardada = cadenaIntercambioRepository.save(cadena);
        return toResponseDTO(guardada);
    }

    private CadenaIntercambioResponseDTO toResponseDTO(CadenaIntercambio cadena) {
        List<PasoCadenaResponseDTO> pasos = new ArrayList<>();

        for (Usuario participante : cadena.getParticipantes()) {
            Intercambio intercambioEntrega = cadena.getIntercambios().stream()
                    .filter(i -> i.getPrestador().getId().equals(participante.getId()))
                    .findFirst()
                    .orElse(null);

            Intercambio intercambioRecibe = cadena.getIntercambios().stream()
                    .filter(i -> i.getReceptor().getId().equals(participante.getId()))
                    .findFirst()
                    .orElse(null);

            LibroResponseDTO libroEntrega = null;
            boolean confirmado = false;
            UUID intercambioId = null;

            if (intercambioEntrega != null) {
                Libro libro = intercambioEntrega.getLibroOfrecido() != null ?
                        intercambioEntrega.getLibroOfrecido() : intercambioEntrega.getLibroDeseado();
                libroEntrega = libroMapper.toResponseDTO(libro);
                confirmado = (intercambioEntrega.getEstado() == EstadoIntercambio.ACEPTADO ||
                        intercambioEntrega.getEstado() == EstadoIntercambio.COMPLETADO);
                intercambioId = intercambioEntrega.getId();
            }

            LibroResponseDTO libroRecibe = null;
            if (intercambioRecibe != null) {
                Libro libro = intercambioRecibe.getLibroDeseado() != null ?
                        intercambioRecibe.getLibroDeseado() : intercambioRecibe.getLibroOfrecido();
                libroRecibe = libroMapper.toResponseDTO(libro);
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

        return new CadenaIntercambioResponseDTO(
                cadena.getId(),
                cadena.getEstado(),
                cadena.getPuntosBonus(),
                pasos,
                cadena.getParticipantes().size()
        );
    }
}
