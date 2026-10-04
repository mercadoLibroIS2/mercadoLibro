package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CompraId implements Serializable {
    private static final long serialVersionUID = 1L;

    private String compradorEmail;
    private String isbn;
    private String propietarioEmail;

    @Column(name = "hora_publicacion")
    private LocalDateTime horaPublicacion;
}
