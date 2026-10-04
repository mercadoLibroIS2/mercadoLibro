package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ReseniaId implements Serializable {
    @Column(name = "isbn_solicitante")
    private String isbnSolicitante;
    @Column(name = "propietario_id_solicitante")
    private String propietarioIdSolicitante;
    @Column(name = "hora_de_publicacion_solicitante")
    private java.time.LocalDateTime horaDePublicacionSolicitante;
    @Column(name = "isbn_ofrecida")
    private String isbnOfrecida;
    @Column(name = "propietario_id_ofrecida")
    private String propietarioIdOfrecida;
    @Column(name = "hora_de_publicacion_ofrecida")
    private java.time.LocalDateTime horaDePublicacionOfrecida;
    @Column(name = "solicitante_reviewer", nullable = false)
    private Boolean solicitanteReviewer; //Si el solicitante es el que hace la reseña es True
}
