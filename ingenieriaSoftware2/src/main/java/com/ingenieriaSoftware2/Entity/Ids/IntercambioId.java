package com.ingenieriaSoftware2.Entity.Ids;

import java.io.Serializable;
import java.util.UUID;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class IntercambioId implements Serializable {
    private static final long serialVersionUID = 1L;

    private String isbnSolicitante;
    private String isbnOfrecida;
    private UUID idSolicitante;
    private UUID idOfrecido;
}
