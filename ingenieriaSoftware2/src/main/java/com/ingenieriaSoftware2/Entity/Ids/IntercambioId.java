package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;

import java.io.Serializable;

@Embeddable
public class IntercambioId implements Serializable {
    private String isbnSolicitante;
    private String isbnOfrecida;
    private String emailSolicitante;
    private String emailOfrecido;
}
