package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Enums.EstadoCompra;
import jakarta.persistence.*;
import jakarta.validation.constraints.PositiveOrZero;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comprador_email", referencedColumnName = "email",
            insertable = false, updatable = false)
    private Usuario comprador;

    @MapsId("isbn")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "isbn")
    private Libro libro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "propietario_email", referencedColumnName = "email",
            insertable = false, updatable = false)
    private Usuario propietario;

    @PositiveOrZero
    @Column(name = "puntos", nullable = false)
    private Integer puntos;

    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false)
    private EstadoCompra estado;

    @Column(name = "info_envio")
    private String infoEnvio;

    @Column(name = "motivo_cancelacion")
    private String motivoCancelacion;

    @OneToMany(mappedBy = "compra")
    private List<MovimientoPuntosCompra> movimientosPuntos = new ArrayList<>();
}