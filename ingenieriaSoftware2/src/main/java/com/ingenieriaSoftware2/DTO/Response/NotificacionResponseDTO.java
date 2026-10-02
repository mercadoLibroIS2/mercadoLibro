package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Notificacion;
import com.ingenieriaSoftware2.Enums.TipoNotificacion;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificacionResponseDTO(
        UUID id,
        TipoNotificacion tipo,
        String mensaje,
        boolean leida,
        LocalDateTime fechaCreacion
) {
    public static NotificacionResponseDTO from(Notificacion notificacion) {
        return new NotificacionResponseDTO(notificacion.getId(), notificacion.getTipo(), notificacion.getMensaje(), notificacion.getLeida(), notificacion.getFechaCreacion());
    }
}
