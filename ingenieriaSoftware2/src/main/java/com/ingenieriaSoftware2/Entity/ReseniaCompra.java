package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.ReseniaCompraId;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Reseña de una compra por puntos. Las reseñas de trueques (Resenia) están atadas por clave a la
 * tabla intercambio, por eso las compras tienen su propia tabla (FK a compra en schema.sql).
 */
@Entity
@Table(name = "resenia_compra")
@Getter
@Setter
@NoArgsConstructor
public class ReseniaCompra {
    @EmbeddedId
    private ReseniaCompraId id;

    @Column(name = "calificacion", nullable = false)
    private short calificacion;

    @Column(name = "comentario")
    private String comentario;
}
