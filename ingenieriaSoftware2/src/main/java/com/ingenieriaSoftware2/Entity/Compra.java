package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Enums.EstadoCompra;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToMany;
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

    @MapsId("compradorEmail")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comprador_email")
    private Usuario comprador;

    @MapsId("isbn")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "isbn", referencedColumnName = "isbn")
    private Libro libro;

    @MapsId("propietarioEmail")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "propietario_email")
    private Usuario propietario;

    private Integer puntos;

    private Instant timestamp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoCompra estado;

    @OneToMany(mappedBy = "compra")
    private List<MovimientoPuntosCompra> movimientosPuntos = new ArrayList<>();
}
