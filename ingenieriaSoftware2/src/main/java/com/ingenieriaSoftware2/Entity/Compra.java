package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Compra {
    @EmbeddedId
    private CompraId id;

    @MapsId("compradorEmail")        // antes: "compradorId"
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comprador_email")
    private Usuario comprador;

    @ManyToOne
    @MapsId("isbn")
    @JoinColumn(name = "isbn")
    private Libro libro;

    @MapsId("propietarioEmail")      // antes: "propietarioId"
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "propietario_email")
    private Usuario propietario;

    private Integer puntos;

    private Instant timestamp;

    @OneToMany(mappedBy = "compra")
    private List<MovimientoPuntosCompra> movimientosPuntos = new ArrayList<>();
}