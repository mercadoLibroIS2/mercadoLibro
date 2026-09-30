package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class IntercambioId implements Serializable {
    @Column(name = "isbn_solicitante", nullable = false)
    private String isbnSolicitante;

    @Column(name = "propietario_id_solicitante", nullable = false)
    private String propietarioIdSolicitante;

    @Column(name = "hora_de_publicacion_solicitante", nullable = false)
    private LocalDateTime horaDePublicacionSolicitante;

    @Column(name = "isbn_ofrecida", nullable = false)
    private String isbnOfrecida;

    @Column(name = "propietario_id_ofrecida", nullable = false)
    private String propietarioIdOfrecida;

    @Column(name = "hora_de_publicacion_ofrecida", nullable = false)
    private LocalDateTime horaDePublicacionOfrecida;
}
