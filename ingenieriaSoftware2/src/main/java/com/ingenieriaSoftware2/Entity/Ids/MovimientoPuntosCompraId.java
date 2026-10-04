package com.ingenieriaSoftware2.Entity.Ids;

import com.ingenieriaSoftware2.Enums.TipoMovimiento;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MovimientoPuntosCompraId implements Serializable {
    private CompraId compraId;
    @Column(name = "id_usuario")
    private String usuarioId;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "tipo", columnDefinition = "tipo_movimiento")
    private TipoMovimiento tipoMovimiento;
}
