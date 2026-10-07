package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Enums.TipoIntercambio;
import jakarta.persistence.*;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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
    @Column(name = "puntos_comprometidos", nullable = false)
    private Integer puntosComprometidos = 0;

    @Column(name = "motivo_rechazo")
    private String motivoRechazo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "isbn_solicitante",                referencedColumnName = "isbn",              insertable = false, updatable = false),
            @JoinColumn(name = "propietario_id_solicitante",      referencedColumnName = "email_propietario", insertable = false, updatable = false),
            @JoinColumn(name = "hora_de_publicacion_solicitante", referencedColumnName = "hora_publicacion",  insertable = false, updatable = false)
    })
    private Publicacion publicacionSolicitante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "isbn_ofrecida",                referencedColumnName = "isbn",              insertable = false, updatable = false),
            @JoinColumn(name = "propietario_id_ofrecida",      referencedColumnName = "email_propietario", insertable = false, updatable = false),
            @JoinColumn(name = "hora_de_publicacion_ofrecida", referencedColumnName = "hora_publicacion",  insertable = false, updatable = false)
    })
    private Publicacion publicacionOfrecida;

    @ManyToOne
    private CadenaIntercambio cadena;

    @OneToMany(mappedBy = "intercambio")
    private List<MovimientoPuntosIntercambio> movimientosPuntos = new ArrayList<>();

}

