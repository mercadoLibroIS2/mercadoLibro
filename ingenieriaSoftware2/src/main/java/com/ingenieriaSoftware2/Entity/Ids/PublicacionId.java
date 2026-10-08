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
    private String isbn;
    private String emailPropietario;
    @Column(name = "hora_publicacion")
    private LocalDateTime horaPublicacion;
}
