package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosReseniaId;
import jakarta.persistence.*;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MovimientoPuntosResenia {

    @EmbeddedId
    private MovimientoPuntosReseniaId movimientoPuntosReseniaId;

    @Positive
    @Column(name = "monto", nullable = false, columnDefinition = "bigint check (monto > 0)")
    private Long monto;

    // FK compuesta a resena (parte 1 de la PK): 6 columnas del intercambio + solicitante_reviewer.
    // solicitante_reviewer ya viene dentro de ReseniaId, así que no hace falta un campo aparte.
    @MapsId("reseniaId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "isbn_solicitante",                referencedColumnName = "isbn_solicitante"),
            @JoinColumn(name = "propietario_id_solicitante",      referencedColumnName = "propietario_id_solicitante"),
            @JoinColumn(name = "hora_de_publicacion_solicitante", referencedColumnName = "hora_de_publicacion_solicitante"),
            @JoinColumn(name = "isbn_ofrecida",                   referencedColumnName = "isbn_ofrecida"),
            @JoinColumn(name = "propietario_id_ofrecida",         referencedColumnName = "propietario_id_ofrecida"),
            @JoinColumn(name = "hora_de_publicacion_ofrecida",    referencedColumnName = "hora_de_publicacion_ofrecida"),
            @JoinColumn(name = "solicitante_reviewer",            referencedColumnName = "solicitante_reviewer")
    })
    private Resenia resenia;

    // FK a usuario (parte 2 de la PK)
    @MapsId("usuarioId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", referencedColumnName = "email")
    private Usuario usuario;
}
