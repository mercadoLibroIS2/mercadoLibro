package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import jakarta.persistence.*;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Intercambio {
    @EmbeddedId
    private IntercambioId id;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado", columnDefinition = "estado_intercambio", nullable = false)
    private EstadoIntercambio estado;

    @PositiveOrZero
    @Column(name = "puntos_comprometidos", nullable = false,
            columnDefinition = "numeric default 0 check (puntos_comprometidos >= 0)")
        private java.math.BigDecimal puntosComprometidos = java.math.BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "isbn_solicitante",                referencedColumnName = "isbn",              insertable = false, updatable = false),
            @JoinColumn(name = "propietario_id_solicitante",      referencedColumnName = "email_propietario_id", insertable = false, updatable = false),
            @JoinColumn(name = "hora_de_publicacion_solicitante", referencedColumnName = "hora_de_publicacion",  insertable = false, updatable = false)
    })
    private Publicacion publicacionSolicitante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "isbn_ofrecida",                referencedColumnName = "isbn",              insertable = false, updatable = false),
            @JoinColumn(name = "propietario_id_ofrecida",      referencedColumnName = "email_propietario_id", insertable = false, updatable = false),
            @JoinColumn(name = "hora_de_publicacion_ofrecida", referencedColumnName = "hora_de_publicacion",  insertable = false, updatable = false)
    })
    private Publicacion publicacionOfrecida;

    @OneToMany(mappedBy = "intercambio")
    private List<MovimientoPuntosIntercambio> movimientosPuntos = new ArrayList<>();

}

