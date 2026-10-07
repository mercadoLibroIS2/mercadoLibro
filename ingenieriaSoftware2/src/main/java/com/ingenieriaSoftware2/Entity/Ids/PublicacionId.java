package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Embeddable
@Data
@NoArgsConstructor   // JPA lo necesita
@AllArgsConstructor
@EqualsAndHashCode
public class PublicacionId implements Serializable {
    @Column(name = "isbn", nullable = false)
    private String isbn;

    @Column(name = "email_propietario", nullable = false)
    private String emailPropietario;

    @Column(name = "hora_publicacion", nullable = false)
    private LocalDateTime horaPublicacion;
}
