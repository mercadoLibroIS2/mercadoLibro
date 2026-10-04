package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.ReseniaId;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.type.PostgreSQLEnumJdbcType;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import com.ingenieriaSoftware2.Enums.CalidadResenia;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
public class Resenia {
    @EmbeddedId
    private ReseniaId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({
            @JoinColumn(name = "isbn_solicitante",                referencedColumnName = "isbn_solicitante", insertable = false, updatable = false),
            @JoinColumn(name = "propietario_id_solicitante",      referencedColumnName = "propietario_id_solicitante", insertable = false, updatable = false),
            @JoinColumn(name = "hora_de_publicacion_solicitante", referencedColumnName = "hora_de_publicacion_solicitante", insertable = false, updatable = false),
            @JoinColumn(name = "isbn_ofrecida",                   referencedColumnName = "isbn_ofrecida", insertable = false, updatable = false),
            @JoinColumn(name = "propietario_id_ofrecida",         referencedColumnName = "propietario_id_ofrecida", insertable = false, updatable = false),
            @JoinColumn(name = "hora_de_publicacion_ofrecida",    referencedColumnName = "hora_de_publicacion_ofrecida", insertable = false, updatable = false)
    })
    private Intercambio intercambio;

    @Min(value = 1, message = "La calificación mínima es 1")
    @Max(value = 5, message = "La calificación máxima es 5")
    @Column(nullable = false)
    private short calificacion;

    @Column
    private String comentario;

    @Enumerated(EnumType.STRING)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
    @Column(name = "calidad", columnDefinition = "calidad_resena")
    private CalidadResenia calidad;

    @Column(name = "solicitante_reviewer", nullable = false, insertable = false, updatable = false)
    private Boolean solicitanteReviewer;

    @OneToMany(mappedBy = "resenia")
    private List<MovimientoPuntosResenia> movimientosPuntos = new ArrayList<>();
}
