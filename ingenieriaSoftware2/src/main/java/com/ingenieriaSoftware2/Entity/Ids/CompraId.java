package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CompraId implements Serializable {
    @Column(name = "comprador_email", nullable = false)
    private String compradorEmail;

    @Column(name = "isbn", nullable = false)
    private String isbn;

    @Column(name = "propietario_email", nullable = false)
    private String propietarioEmail;

    @Column(name = "hora_publicacion", nullable = false)
    private LocalDateTime horaPublicacion;
}
