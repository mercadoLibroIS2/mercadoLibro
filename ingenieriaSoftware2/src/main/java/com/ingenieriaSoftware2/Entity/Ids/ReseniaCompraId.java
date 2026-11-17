package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
public class ReseniaCompraId implements Serializable {
    @Embedded
    private CompraId compraId;

    /** true si quien reseña es el comprador (califica al vendedor); false si es el vendedor. */
    @Column(name = "comprador_reviewer", nullable = false)
    private Boolean compradorReviewer;
}
