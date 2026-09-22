package com.ingenieriaSoftware2.Entity.Ids;

import com.ingenieriaSoftware2.Enums.TipoMovimiento;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MovimientoPuntosId implements Serializable {

    @Column(name = "isbn_solicitante")
    private String isbnSolicitante;

    @Column(name = "isbn_ofrecida")
    private String isbnOfrecida;

    @Column(name = "id_solicitante")
    private UUID idSolicitante;

    @Column(name = "id_ofrecido")
    private UUID idOfrecido;

    @Column(name = "id_usuario")
    private UUID idUsuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo")
    private TipoMovimiento tipo;
}