package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Enums.CanalNotificacion;
import com.ingenieriaSoftware2.Enums.EstadoNotificacion;
import com.ingenieriaSoftware2.Enums.TipoNotificacion;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

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
    @JoinColumn(name = "intercambio_id", nullable = true)
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
