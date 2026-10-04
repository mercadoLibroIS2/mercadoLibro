package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ReporteId implements Serializable {
    @Column(name = "email_reportante_id")
    private String emailReportanteId;
    @Column(name = "hora_reporte")
    private LocalDateTime horaReporte;
    @Column(name = "email_reportado_id")
    private String emailReportadoId;
}
