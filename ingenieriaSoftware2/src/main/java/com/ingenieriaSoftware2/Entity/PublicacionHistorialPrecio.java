package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.PublicacionHistorialPrecioId;
import com.ingenieriaSoftware2.Enums.ColorSemaforo;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "publicacion_historial_precio")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PublicacionHistorialPrecio {
    @EmbeddedId
    private PublicacionHistorialPrecioId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "isbn", referencedColumnName = "isbn", insertable = false, updatable = false),
            @JoinColumn(name = "email_propietario_id", referencedColumnName = "email_propietario_id", insertable = false, updatable = false),
            @JoinColumn(name = "hora_de_publicacion", referencedColumnName = "hora_de_publicacion", insertable = false, updatable = false)
    })
    private Publicacion publicacion;

    @Column(name = "valor_puntos_anterior", nullable = false)
    private Long valorPuntosAnterior;
    @Column(name = "valor_puntos_nuevo", nullable = false)
    private Long valorPuntosNuevo;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "color_anterior", columnDefinition = "color_semaforo")
    private ColorSemaforo colorAnterior;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "color_nuevo", columnDefinition = "color_semaforo")
    private ColorSemaforo colorNuevo;
}
