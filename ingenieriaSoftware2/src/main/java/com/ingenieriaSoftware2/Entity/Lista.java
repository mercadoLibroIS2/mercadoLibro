package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.ListaId;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "lista")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Lista {
    @EmbeddedId
    private ListaId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "email_usuario", referencedColumnName = "email", insertable = false, updatable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "isbn", referencedColumnName = "isbn", insertable = false, updatable = false)
    private Libro libro;

    @Column(name = "nota_privada")
    private String notaPrivada;
    @Column(name = "precio_min")
    private Long precioMin;
    @Column(name = "precio_max")
    private Long precioMax;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "condiciones_aceptables", columnDefinition = "calidad_libro[]")
    private EstadoFisico[] condicionesAceptables;

    @Column(name = "fecha_agregado", nullable = false)
    private LocalDateTime fechaAgregado;
}
