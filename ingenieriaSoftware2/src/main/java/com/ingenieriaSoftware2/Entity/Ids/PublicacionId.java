package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
public class PublicacionId implements Serializable {
    private String isbn;
    private UUID idPropietario;
}
