package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosIntercambioId;
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
public class MovimientoPuntosIntercambio {

    @EmbeddedId
    private MovimientoPuntosIntercambioId movimientoPuntosIntercambioId;

    @Positive
    @Column(name = "monto", nullable = false, columnDefinition = "bigint check (monto > 0)")
    private Long monto;

    // FK compuesta a intercambio (parte 1 de la PK).
    // Se tiene que llamar "intercambio": es el nombre que usa mappedBy en Intercambio.
    @MapsId("intercambioId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "isbn_solicitante",                referencedColumnName = "isbn_solicitante"),
            @JoinColumn(name = "propietario_id_solicitante",      referencedColumnName = "propietario_id_solicitante"),
            @JoinColumn(name = "hora_de_publicacion_solicitante", referencedColumnName = "hora_de_publicacion_solicitante"),
            @JoinColumn(name = "isbn_ofrecida",                   referencedColumnName = "isbn_ofrecida"),
            @JoinColumn(name = "propietario_id_ofrecida",         referencedColumnName = "propietario_id_ofrecida"),
            @JoinColumn(name = "hora_de_publicacion_ofrecida",    referencedColumnName = "hora_de_publicacion_ofrecida")
    })
    private Intercambio intercambio;

    // FK a usuario (parte 2 de la PK)
    @MapsId("usuarioId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;
}
