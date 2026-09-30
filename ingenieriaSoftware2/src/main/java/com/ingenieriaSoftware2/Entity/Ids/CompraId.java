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
    private String compradorEmail;
    private String isbn;
    private String propietarioEmail;
    @Column(name = "hora_publicacion")
    private LocalDateTime horaPublicacion;
}
