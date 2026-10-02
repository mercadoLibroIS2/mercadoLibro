package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosSistemaId;
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
public class MovimientoPuntosSistema {

    @EmbeddedId
    private MovimientoPuntosSistemaId movimientoPuntosSistemaId;

    @Positive
    @Column(
            name = "monto",
            nullable = false,
            columnDefinition = "bigint check (monto > 0)"
    )
    private Long monto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(
                    name = "tipo_evento",
                    referencedColumnName = "tipo_evento_sistema",
                    insertable = false,
                    updatable = false
            ),
            @JoinColumn(
                    name = "fecha_evento",
                    referencedColumnName = "fecha_evento",
                    insertable = false,
                    updatable = false
            )
    })
    private EventoSistema eventoSistema;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "id_usuario",
            insertable = false,
            updatable = false
    )
    private Usuario usuario;
}