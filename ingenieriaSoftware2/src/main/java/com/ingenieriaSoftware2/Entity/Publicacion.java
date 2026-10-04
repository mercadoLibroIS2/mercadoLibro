package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "publicacion")
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
public class Publicacion {
    @EmbeddedId
    private PublicacionId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "isbn", referencedColumnName = "isbn", insertable = false, updatable = false)
    private Libro libro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "email_propietario_id", referencedColumnName = "email", insertable = false, updatable = false)
    private Usuario propietario;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado_fisico", columnDefinition = "calidad_libro")
    private EstadoFisico estadoFisico;

    @Column(name = "valor_puntos_solicitado", nullable = false)
    private Integer valorPuntosSolicitado;
    @Column(name = "valor_referencia_calculado")
    private Integer valorReferenciaCalculado;
    @Column(name = "comentario")
    private String comentario;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado", columnDefinition = "estado_publicacion", nullable = false)
    private EstadoPublicacion estado = EstadoPublicacion.DISPONIBLE;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "color_semaforo", columnDefinition = "color_semaforo", nullable = false)
    private ColorSemaforo colorSemaforo = ColorSemaforo.SIN_REFERENCIA;

    @OneToMany(mappedBy = "publicacion")
    private List<Notificacion> notificaciones = new ArrayList<>();

    @OneToMany(mappedBy = "publicacionSolicitante")
    private List<Intercambio> intercambiosComoSolicitante = new ArrayList<>();

    @OneToMany(mappedBy = "publicacionOfrecida")
    private List<Intercambio> intercambiosComoOfrecida = new ArrayList<>();
}
