package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "compra")
@Getter
@Setter
@NoArgsConstructor
public class Compra {

    @EmbeddedId
    private CompraId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comprador_id", insertable = false, updatable = false)
    private Usuario comprador;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "isbn", referencedColumnName = "isbn",
                    insertable = false, updatable = false),
            @JoinColumn(name = "propietario_id", referencedColumnName = "propietario_id",
                    insertable = false, updatable = false),
            @JoinColumn(name = "hora_de_publicacion", referencedColumnName = "hora_de_publicacion",
                    insertable = false, updatable = false)
    })
    private Publicacion publicacion;

    @Column(name = "puntos")
    private int puntos;
}