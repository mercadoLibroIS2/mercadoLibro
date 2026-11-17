package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Enums.AccionAdmin;
import com.ingenieriaSoftware2.Enums.EstadoReporte;
import com.ingenieriaSoftware2.Enums.MotivoReporte;
import com.ingenieriaSoftware2.Enums.TipoReporte;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Denuncia de un usuario sobre otro usuario, una publicación o un intercambio.
 * La revisa un administrador, que puede descartarla o resolverla con una acción.
 */
@Entity
@Table(name = "reporte")
@Getter
@Setter
@NoArgsConstructor
public class Reporte {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "email_denunciante", nullable = false)
    private String emailDenunciante;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoReporte tipo;

    @Column(name = "email_denunciado")
    private String emailDenunciado;

    /** Publicación reportada (tipo PUBLICACION). */
    private String isbn;

    @Column(name = "hora_publicacion")
    private LocalDateTime horaPublicacion;

    /** Intercambio reportado (tipo INTERCAMBIO), con el mismo formato de id que usa el frontend. */
    @Column(name = "intercambio_ref", length = 600)
    private String intercambioRef;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private MotivoReporte motivo;

    @Column(length = 1000)
    private String detalle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoReporte estado = EstadoReporte.ABIERTO;

    @Column(length = 1000)
    private String resolucion;

    @Enumerated(EnumType.STRING)
    @Column(name = "accion_tomada", length = 30)
    private AccionAdmin accionTomada;

    @Column(name = "email_resolutor")
    private String emailResolutor;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    @Column(name = "fecha_resolucion")
    private LocalDateTime fechaResolucion;
}
