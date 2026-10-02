package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Response.NotificacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Notificacion;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.TipoNotificacion;
import com.ingenieriaSoftware2.Exception.Notificacion.NotificacionNoEncontradaException;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Repository.NotificacionRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class NotificacionServiceImpl implements NotificacionService {
    @Autowired
    private NotificacionRepository notificacionRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Override
    @Transactional
    public void crear(String emailDestinatario, TipoNotificacion tipo, String mensaje) {
        Usuario usuario = usuarioRepository.findById(UUID.fromString(emailDestinatario)).orElseThrow(()-> new UsuarioNoEncontrado());

        Notificacion notificacion = new Notificacion();
        notificacion.setUsuario(usuario);
        notificacion.setTipo(tipo);
        notificacion.setMensaje(mensaje);
        notificacionRepository.save(notificacion);
    }

    @Override
    @Transactional
    public Page<NotificacionResponseDTO> listar(UUID usuarioId, boolean soloNoLeidas, Pageable pageable) {
        String email = obtenerEmail(usuarioId);
        Page<Notificacion> page = soloNoLeidas
                ? notificacionRepository.findByUsuarioEmailAndLeidaFalseOrderByFechaCreacionDesc(email, pageable)
                : notificacionRepository.findByUsuarioEmailOrderByFechaCreacionDesc(email, pageable);
        return page.map(NotificacionResponseDTO::from);
    }

    @Override
    @Transactional
    public long contarNoLeidas(UUID usuarioId) {
        return notificacionRepository.countByUsuarioEmailAndLeidaFalse(obtenerEmail(usuarioId));
    }

    @Override
    @Transactional
    public void marcarLeida(UUID notificacionId, UUID usuarioId) {
        String email = obtenerEmail(usuarioId);
        Notificacion notificacion = notificacionRepository.findById(notificacionId).filter(notif -> notif.getUsuario().getEmail().equals(email)).orElseThrow(()-> new NotificacionNoEncontradaException());
        notificacion.setLeida(true);
    }

    @Override
    @Transactional
    public void marcarTodasLeidas(UUID usuarioId) {
        notificacionRepository.marcarTodasLeidas(obtenerEmail(usuarioId));
    }

    private String obtenerEmail(UUID usuarioId) {
        return usuarioRepository.findById(UUID.fromString(String.valueOf(usuarioId))).orElseThrow(()-> new UsuarioNoEncontrado()).getEmail();
    }
}
