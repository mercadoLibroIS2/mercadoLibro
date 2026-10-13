package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Response.NotificacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Notificacion;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.TipoNotificacion;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Repository.NotificacionRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class NotificacionServiceImpl implements NotificacionService {
    @Autowired
    private NotificacionRepository notificacionRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Override
    @Transactional
    public void crear(String emailDestinatario, TipoNotificacion tipo) {
        Usuario usuario = usuarioRepository.findByEmail(emailDestinatario).orElseThrow(()-> new UsuarioNoEncontrado());

        Notificacion notificacion = new Notificacion();
        notificacion.setUsuario(usuario);
        notificacion.setTipo(tipo);
        notificacionRepository.save(notificacion);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificacionResponseDTO> listar(UUID usuarioId, boolean soloNoLeidas, Pageable pageable) {
        String email = obtenerEmail(usuarioId);
        Page<Notificacion> page = soloNoLeidas
                ? notificacionRepository.findByUsuarioEmailAndLeidaFalseOrderByFechaCreacionDesc(email, pageable)
                : notificacionRepository.findByUsuarioEmailOrderByFechaCreacionDesc(email, pageable);
        return page.map(NotificacionResponseDTO::from);
    }

    @Override
    @Transactional(readOnly = true)
    public long contarNoLeidas(UUID usuarioId) {
        return notificacionRepository.countByUsuarioEmailAndLeidaFalse(obtenerEmail(usuarioId));
    }

    @Override
    @Transactional
    public void marcarLeida(UUID notificacionId, UUID usuarioId) {
        String email = obtenerEmail(usuarioId);
        Notificacion notificacion = notificacionRepository.findById(notificacionId)
                .filter(notif -> notif.getUsuario().getEmail().equals(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificación no encontrada"));
        notificacion.setLeida(true);
    }

    @Override
    @Transactional
    public void marcarTodasLeidas(UUID usuarioId) {
        notificacionRepository.marcarTodasLeidas(obtenerEmail(usuarioId));
    }

    private String obtenerEmail(UUID usuarioId) {
        return usuarioRepository.findById(usuarioId).orElseThrow(()-> new UsuarioNoEncontrado()).getEmail();
    }
}
