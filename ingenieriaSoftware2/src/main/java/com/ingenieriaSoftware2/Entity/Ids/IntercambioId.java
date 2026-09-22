package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
public class IntercambioId implements Serializable {
    private String isbnSolicitante;
    private String isbnOfrecida;
    private UUID idSolicitante;
    private UUID idOfrecido;
}
