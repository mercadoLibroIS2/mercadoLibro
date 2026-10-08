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
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ReseniaId implements Serializable {
    private IntercambioId intercambioId;
    @Column(name = "solicitante_reviewer")
    private Boolean solicitanteReviewer; //Si el solicitante es el que hace la reseña es True
}
