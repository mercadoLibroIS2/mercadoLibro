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

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
public class Resenia {
    @EmbeddedId
    private ReseniaId id;

    @MapsId("intercambioId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({
            @JoinColumn(name = "isbn_solicitante",                referencedColumnName = "isbn_solicitante"),
            @JoinColumn(name = "propietario_id_solicitante",      referencedColumnName = "propietario_id_solicitante"),
            @JoinColumn(name = "hora_de_publicacion_solicitante", referencedColumnName = "hora_de_publicacion_solicitante"),
            @JoinColumn(name = "isbn_ofrecida",                   referencedColumnName = "isbn_ofrecida"),
            @JoinColumn(name = "propietario_id_ofrecida",         referencedColumnName = "propietario_id_ofrecida"),
            @JoinColumn(name = "hora_de_publicacion_ofrecida",    referencedColumnName = "hora_de_publicacion_ofrecida")
    })
    private Intercambio intercambio;

    @Min(value = 1, message = "La calificación mínima es 1")
    @Max(value = 5, message = "La calificación máxima es 5")
    @Column(nullable = false)
    private short calificacion;

    @Column
    private String comentario;

    @OneToMany(mappedBy = "resenia")
    private List<MovimientoPuntosResenia> movimientosPuntos = new ArrayList<>();
}
