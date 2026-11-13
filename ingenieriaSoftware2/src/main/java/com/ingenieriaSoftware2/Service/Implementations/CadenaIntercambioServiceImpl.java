package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.CadenaIntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.CadenaIntercambio;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCadena;
import com.ingenieriaSoftware2.Exception.Intercambio.AccionNoPermitidaException;
import com.ingenieriaSoftware2.Repository.CadenaIntercambioRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.CadenaIntercambioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class CadenaIntercambioServiceImpl implements CadenaIntercambioService {

    @Autowired
    private CadenaIntercambioRepository cadenaIntercambioRepository;

    @Autowired(required = false)
    private UsuarioRepository usuarioRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CadenaIntercambioResponseDTO> listarCadenas() {
        return cadenaIntercambioRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    @Override
    @Transactional
    public CadenaIntercambioResponseDTO crearCadena(CadenaIntercambioRequestDTO dto) {
        CadenaIntercambio cadena = new CadenaIntercambio();
        cadena.setPuntosBonus(dto != null && dto.puntosBonus() != null ? dto.puntosBonus() : 50);
        cadena.setEstado(EstadoCadena.PROPUESTA);

        Set<Usuario> participantes = new LinkedHashSet<>();
        if (dto != null && dto.participantesEmails() != null && usuarioRepository != null) {
            for (String email : dto.participantesEmails()) {
                if (email != null && !email.isBlank()) {
                    Usuario usuario = usuarioRepository.findByEmail(email)
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.NOT_FOUND, "Usuario no encontrado: " + email));
                    participantes.add(usuario);
                }
            }
        }
        cadena.setParticipantes(participantes);

        return toDTO(cadenaIntercambioRepository.save(cadena));
    }

    @Override
    @Transactional
    public CadenaIntercambioResponseDTO aceptarCadena(UUID cadenaId, UUID usuarioId) {
        CadenaIntercambio cadena = cadenaIntercambioRepository.findById(cadenaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cadena no encontrada"));

        if (cadena.getEstado() == EstadoCadena.CANCELADA || cadena.getEstado() == EstadoCadena.COMPLETADA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La cadena no puede ser aceptada en su estado actual");
        }

        validarParticipante(cadena, usuarioId);

        if (cadena.getEstado() == EstadoCadena.PROPUESTA) {
            cadena.setEstado(EstadoCadena.EN_CURSO);
        } else {
            cadena.setEstado(EstadoCadena.COMPLETADA);
        }

        return toDTO(cadenaIntercambioRepository.save(cadena));
    }

    @Override
    @Transactional
    public CadenaIntercambioResponseDTO rechazarCadena(UUID cadenaId, UUID usuarioId) {
        CadenaIntercambio cadena = cadenaIntercambioRepository.findById(cadenaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cadena no encontrada"));

        if (cadena.getEstado() == EstadoCadena.COMPLETADA || cadena.getEstado() == EstadoCadena.CANCELADA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La cadena ya fue completada o cancelada");
        }

        validarParticipante(cadena, usuarioId);

        cadena.setEstado(EstadoCadena.CANCELADA);
        return toDTO(cadenaIntercambioRepository.save(cadena));
    }

    private void validarParticipante(CadenaIntercambio cadena, UUID usuarioId) {
        if (usuarioId != null && cadena.getParticipantes() != null && !cadena.getParticipantes().isEmpty()) {
            boolean esParticipante = cadena.getParticipantes().stream()
                    .anyMatch(u -> usuarioId.equals(u.getId()));
            if (!esParticipante) {
                throw new AccionNoPermitidaException("El usuario no forma parte de esta cadena");
            }
        }
    }

    private CadenaIntercambioResponseDTO toDTO(CadenaIntercambio cadena) {
        List<String> emails = cadena.getParticipantes() != null
                ? cadena.getParticipantes().stream()
                        .map(Usuario::getEmail)
                        .toList()
                : List.of();
        return new CadenaIntercambioResponseDTO(
                cadena.getId(),
                cadena.getPuntosBonus(),
                cadena.getEstado(),
                emails
        );
    }
}

