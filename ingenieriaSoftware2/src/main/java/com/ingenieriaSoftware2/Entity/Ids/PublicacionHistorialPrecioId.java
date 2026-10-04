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
public class PublicacionHistorialPrecioId implements Serializable {
    @Column(name = "isbn")
    private String isbn;
    @Column(name = "email_propietario_id")
    private String emailPropietarioId;
    @Column(name = "hora_de_publicacion")
    private LocalDateTime horaDePublicacion;
    @Column(name = "fecha_cambio")
    private LocalDateTime fechaCambio;
}
