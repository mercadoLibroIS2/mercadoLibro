package com.ingenieriaSoftware2.Entity.Ids;

import com.ingenieriaSoftware2.Enums.TipoMovimiento;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MovimientoPuntosSistemaId implements Serializable {

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(
                    name = "tipoEventoSistema",
                    column = @Column(name = "tipo_evento")
            ),
            @AttributeOverride(
                    name = "fechaEvento",
                    column = @Column(name = "fecha_evento")
            )
    })
    private EventoSistemaId eventoSistemaId;

        @Column(name = "id_usuario")
        private String usuarioId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo")
    private TipoMovimiento tipoMovimiento;
}