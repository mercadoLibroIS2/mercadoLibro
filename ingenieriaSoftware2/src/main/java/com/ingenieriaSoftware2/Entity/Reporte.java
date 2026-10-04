package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.ReporteId;
import com.ingenieriaSoftware2.Enums.EntidadReporte;
import com.ingenieriaSoftware2.Enums.EstadoReporte;
import com.ingenieriaSoftware2.Enums.MotivoReporte;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "reporte")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Reporte {
    @EmbeddedId
    private ReporteId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "email_reportante_id", referencedColumnName = "email", insertable = false, updatable = false)
    private Usuario reportante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "email_reportado_id", referencedColumnName = "email", insertable = false, updatable = false)
    private Usuario reportado;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "entidad_tipo", nullable = false, columnDefinition = "entidad_reporte")
    private EntidadReporte entidadTipo;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "motivo", nullable = false, columnDefinition = "motivo_reporte")
    private MotivoReporte motivo;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado", nullable = false, columnDefinition = "estado_reporte")
    private EstadoReporte estado = EstadoReporte.PENDIENTE;
}
