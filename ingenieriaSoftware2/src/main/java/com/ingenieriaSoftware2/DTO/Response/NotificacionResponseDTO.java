package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Notificacion;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificacionResponseDTO(
        UUID id,
        String mensaje,
        String tipo,
        boolean leida,
        boolean archivada,
        LocalDateTime fechaCreacion
) {
    public static NotificacionResponseDTO from(Notificacion notificacion) {
        return new NotificacionResponseDTO(
                notificacion.getId(),
                notificacion.getMensaje(),
                notificacion.getTipo() != null ? notificacion.getTipo().name() : null,
                Boolean.TRUE.equals(notificacion.getLeida()),
                Boolean.TRUE.equals(notificacion.getArchivada()),
                notificacion.getFechaCreacion()
        );
    }
}
