package com.ingenieriaSoftware2.Entity.Ids;

import com.ingenieriaSoftware2.Enums.TipoEventoSistema;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
public class EventoSistemaId implements Serializable {
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_evento_sistema")
    TipoEventoSistema tipoEventoSistema;
    @Column(name = "fecha_evento")
    LocalDateTime fechaEvento = LocalDateTime.now();
}
