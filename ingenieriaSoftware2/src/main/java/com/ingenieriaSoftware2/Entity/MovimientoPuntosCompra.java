package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosCompraId;
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
public class MovimientoPuntosCompra {

    @EmbeddedId
    private MovimientoPuntosCompraId movimientoPuntosCompraId;

    @Positive
    @Column(name = "monto", nullable = false, columnDefinition = "bigint check (monto > 0)")
    private Long monto;

    // FK compuesta a compra (parte 1 de la PK).
    // name = columna en esta tabla / referencedColumnName = columna en compra
    @MapsId("compraId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "comprador_id",        referencedColumnName = "comprador_id"),
            @JoinColumn(name = "isbn",                referencedColumnName = "isbn"),
            @JoinColumn(name = "propietario_id",      referencedColumnName = "propietario_id"),
            @JoinColumn(name = "hora_de_publicacion", referencedColumnName = "hora_de_publicacion")
    })
    private Compra compra;

    // FK a usuario (parte 2 de la PK)
    @MapsId("usuarioId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", referencedColumnName = "email")
    private Usuario usuario;
}
