package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Embeddable;

import java.io.Serializable;

@Embeddable
public class CompraId implements Serializable {
    private String compradorEmail;
    private String isbn;
    private String propietarioEmail;
}
