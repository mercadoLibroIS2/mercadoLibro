package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Enums.CanalNotificacion;
import com.ingenieriaSoftware2.Enums.EstadoNotificacion;
import com.ingenieriaSoftware2.Enums.TipoNotificacion;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Notificacion {
    @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        @Column(name = "id")
        private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "email_usuario", nullable = false)
    private Usuario usuario;

    // FK compuesta a publicacion.
    // name = columna en notificacion / referencedColumnName = columna en publicacion
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "isbn",                 referencedColumnName = "isbn"),
            @JoinColumn(name = "email_propietario_id", referencedColumnName = "email_propietario_id"),
            @JoinColumn(name = "hora_de_publicacion",  referencedColumnName = "hora_de_publicacion")
    })
    private Publicacion publicacion;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "tipo", nullable = false, columnDefinition = "tipo_notificacion")
    private TipoNotificacion tipo;

    @Column(name = "leida", nullable = false, columnDefinition = "boolean default false")
    private Boolean leida = false;

    @Column(name = "archivada", nullable = false, columnDefinition = "boolean default false")
    private Boolean archivada = false;

    @CreationTimestamp
    @Column(name = "fecha_creacion", nullable = false, updatable = false,
            columnDefinition = "timestamp default now()")
    private LocalDateTime fechaCreacion;
}
