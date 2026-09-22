package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Enums.ColorSemaforo;
import com.ingenieriaSoftware2.Enums.CalidadLibro;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "publicacion")
@Getter
@Setter
@NoArgsConstructor
public class Publicacion {

    @EmbeddedId
    private PublicacionId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "propietario_id", insertable = false, updatable = false)
    private Usuario propietario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "isbn", insertable = false, updatable = false)
    private Libro libro;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_fisico")
    private CalidadLibro calidadLibro;

    @Column(name = "valor_puntos_solicitado")
    private Integer valorPuntosSolicitado;

    @Column(name = "valor_referencia_calculado")
    private Integer valorReferenciaCalculado;

    @Column(name = "comentario")
    private String comentario;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado")
    private EstadoPublicacion estado;

    @Enumerated(EnumType.STRING)
    @Column(name = "color_semaforo", insertable = false, updatable = false)
    private ColorSemaforo colorSemaforo;
}