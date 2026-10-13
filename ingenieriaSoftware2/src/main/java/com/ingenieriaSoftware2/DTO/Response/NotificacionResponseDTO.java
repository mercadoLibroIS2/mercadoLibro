package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Notificacion;
import com.ingenieriaSoftware2.Enums.TipoNotificacion;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificacionResponseDTO(
        UUID id,
        TipoNotificacion tipo,
        boolean leida,
        boolean archivada,
        LocalDateTime fechaCreacion
) {
    public static NotificacionResponseDTO from(Notificacion notificacion) {
        return new NotificacionResponseDTO(
                notificacion.getId(),
                notificacion.getTipo(),
                Boolean.TRUE.equals(notificacion.getLeida()),
                Boolean.TRUE.equals(notificacion.getArchivada()),
                notificacion.getFechaCreacion()
        );
    }
}
