package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Enums.ColorSemaforo;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
public class Publicacion {

    @EmbeddedId
    private PublicacionId id;

    @MapsId("isbn")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "isbn")
    private Libro libro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "email_propietario", referencedColumnName = "email",
            insertable = false, updatable = false)
    private Usuario propietario;

    @Enumerated(EnumType.STRING)
    private EstadoFisico estadoFisico;

    private Integer valorPuntosSolicitado;

    private Integer valorReferenciaCalculado;

    private String comentario;

    @Enumerated(EnumType.STRING)
    private EstadoPublicacion estadoPublicacion = EstadoPublicacion.DISPONIBLE;

    @Enumerated(EnumType.STRING)
    private ColorSemaforo colorSemaforo = ColorSemaforo.SIN_REFERENCIA;

    @OneToMany(mappedBy = "publicacion")
    private List<Notificacion> notificaciones = new ArrayList<>();

    @OneToMany(mappedBy = "publicacionSolicitante")
    private List<Intercambio> intercambiosComoSolicitante = new ArrayList<>();

    @OneToMany(mappedBy = "publicacionOfrecida")
    private List<Intercambio> intercambiosComoOfrecida = new ArrayList<>();
}
