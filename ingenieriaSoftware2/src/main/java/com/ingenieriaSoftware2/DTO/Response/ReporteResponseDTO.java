package com.ingenieriaSoftware2.DTO.Response;

import com.ingenieriaSoftware2.Entity.Reporte;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReporteResponseDTO(
        UUID id,
        String emailDenunciante,
        String tipo,
        String emailDenunciado,
        String isbn,
        LocalDateTime horaPublicacion,
        String intercambioId,
        String motivo,
        String detalle,
        String estado,
        String resolucion,
        String accionTomada,
        String emailResolutor,
        LocalDateTime fecha,
        LocalDateTime fechaResolucion
) {
    public static ReporteResponseDTO from(Reporte r) {
        return new ReporteResponseDTO(
                r.getId(), r.getEmailDenunciante(), r.getTipo().name(), r.getEmailDenunciado(),
                r.getIsbn(), r.getHoraPublicacion(), r.getIntercambioRef(), r.getMotivo().name(),
                r.getDetalle(), r.getEstado().name(), r.getResolucion(),
                r.getAccionTomada() == null ? null : r.getAccionTomada().name(),
                r.getEmailResolutor(), r.getFecha(), r.getFechaResolucion());
    }
}
