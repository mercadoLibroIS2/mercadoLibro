package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.EventoSistemaId;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EventoSistema {
    @EmbeddedId
    private EventoSistemaId eventoSistemaId;
    @Column(nullable = true)
    private String descripcion;

    @OneToMany(mappedBy = "eventoSistema")
    private List<MovimientoPuntosSistema> movimientosPuntos = new ArrayList<>();
}
