package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Embeddable
@AllArgsConstructor
@NoArgsConstructor
public class PublicacionId implements Serializable {

    @Column(name = "isbn", nullable = false)
    private String isbn;

    @Column(name = "propietario_id", nullable = false, length = 36)
    private UUID idPropietario;

    @Column(name = "hora_de_publicacion", nullable = false)
    private LocalDateTime horaPublicacion;

}