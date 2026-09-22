package com.ingenieriaSoftware2.Entity.Ids;

import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Embeddable
public class CompraId implements Serializable {
    private UUID idComprador;
    private String isbn;
    private UUID idPropietario;
    private LocalDateTime horaPublicacion;
}
