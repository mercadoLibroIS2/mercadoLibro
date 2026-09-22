package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class MovimientoPuntos {

    @EmbeddedId
    private MovimientoPuntosId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "isbn_solicitante", referencedColumnName = "isbnSolicitante",
                    insertable = false, updatable = false),
            @JoinColumn(name = "isbn_ofrecida", referencedColumnName = "isbnOfrecida",
                    insertable = false, updatable = false),
            @JoinColumn(name = "id_solicitante", referencedColumnName = "idSolicitante",
                    insertable = false, updatable = false),
            @JoinColumn(name = "id_ofrecido", referencedColumnName = "idOfrecido",
                    insertable = false, updatable = false)
    })
    private Intercambio intercambio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", insertable = false, updatable = false)
    private Usuario usuario;

    @Column(name = "monto", nullable = false)
    private int monto;

    @OneToMany(mappedBy = "movimientoPuntos", cascade = CascadeType.ALL)
    private List<Notificacion> notificaciones = new ArrayList<>();
}