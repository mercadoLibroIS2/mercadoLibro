package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Compra {
    @EmbeddedId
    private CompraId id;

    @ManyToOne
    @MapsId("compradorId")
    @JoinColumn(name = "comprador_id")
    private Usuario comprador;

    @ManyToOne
    @MapsId("isbn")
    @JoinColumn(name = "isbn")
    private Libro libro;

    @ManyToOne
    @MapsId("propietarioId")
    @JoinColumn(name = "propietario_id")
    private Usuario propietario;

    private Integer puntos;

    private Instant timestamp;
}