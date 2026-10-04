package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Enums.EstadoCompra;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Compra {
    @EmbeddedId
        @AttributeOverrides({
            @AttributeOverride(name = "compradorEmail", column = @Column(name = "comprador_id")),
            @AttributeOverride(name = "isbn", column = @Column(name = "isbn")),
            @AttributeOverride(name = "propietarioEmail", column = @Column(name = "propietario_id")),
            @AttributeOverride(name = "horaPublicacion", column = @Column(name = "hora_de_publicacion"))
        })
    private CompraId id;

    @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "comprador_id", referencedColumnName = "email", insertable = false, updatable = false)
    private Usuario comprador;

    @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumns({
            @JoinColumn(name = "isbn", referencedColumnName = "isbn", insertable = false, updatable = false),
            @JoinColumn(name = "propietario_id", referencedColumnName = "email_propietario_id", insertable = false, updatable = false),
            @JoinColumn(name = "hora_de_publicacion", referencedColumnName = "hora_de_publicacion", insertable = false, updatable = false)
        })
        private Publicacion publicacion;

    @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "propietario_id", referencedColumnName = "email", insertable = false, updatable = false)
    private Usuario propietario;

    private Long puntos;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado", nullable = false, columnDefinition = "estado_compra")
    private EstadoCompra estado;

    @OneToMany(mappedBy = "compra")
    private List<MovimientoPuntosCompra> movimientosPuntos = new ArrayList<>();
}
