package com.ingenieriaSoftware2.Entity;

import java.util.UUID;

import com.ingenieriaSoftware2.Enums.CanalNotificacion;
import com.ingenieriaSoftware2.Enums.EstadoNotificacion;
import com.ingenieriaSoftware2.Enums.TipoNotificacion;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Notificacion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

        @ManyToOne
        @JoinColumns({
            @JoinColumn(name = "isbn_solicitante", referencedColumnName = "isbn_solicitante"),
            @JoinColumn(name = "isbn_ofrecida", referencedColumnName = "isbn_ofrecida"),
            @JoinColumn(name = "id_solicitante", referencedColumnName = "id_solicitante"),
            @JoinColumn(name = "id_ofrecido", referencedColumnName = "id_ofrecido")
        })
    private Intercambio intercambio;

    @ManyToOne
    @JoinColumn(name = "resenia_id", nullable = true)
    private Resenia resenia;

    @ManyToOne
    @JoinColumn(name = "movimiento_puntos_id", nullable = true)
    private MovimientoPuntos movimientoPuntos;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoNotificacion tipo;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CanalNotificacion canal;

    @Column(nullable = false)
    private String asunto;

    @Column(length = 1000, nullable = false)
    private String mensaje;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoNotificacion estado = EstadoNotificacion.PENDIENTE;
}
