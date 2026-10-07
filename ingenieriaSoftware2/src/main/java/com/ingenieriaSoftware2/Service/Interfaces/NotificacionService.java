package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Response.NotificacionResponseDTO;
import com.ingenieriaSoftware2.Enums.TipoNotificacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface NotificacionService {
    void crear(String emailDestinatario, TipoNotificacion tipo, String mensaje);

    Page<NotificacionResponseDTO> listar(UUID usuarioId, boolean soloNoLeidas, Pageable pageable);

    long contarNoLeidas(UUID usuarioId);

    void marcarLeida(UUID notificacionId, UUID usuarioId);

    void marcarTodasLeidas(UUID usuarioId);
}
