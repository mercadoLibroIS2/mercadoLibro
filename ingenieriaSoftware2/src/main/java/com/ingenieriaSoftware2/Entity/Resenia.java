package com.ingenieriaSoftware2.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
public class Resenia {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "intercambio_id", nullable = false)
    private Intercambio intercambio;

    @ManyToOne
    @JoinColumn(name = "autor", nullable = false)
    private Usuario autor; // quien escribe la reseña

    @ManyToOne
    @JoinColumn(name = "calificado", nullable = false)
    private Usuario calificado; // a quién se reseña

    @Min(value = 0, message = "La calificación mínima es 0")
    @Max(value = 5, message = "La calificación máxima es 5")
    @Column(nullable = false)
    private float calificacion;

    @Column(length = 500)
    private String comentario;

    private LocalDate fecha = LocalDate.now();

    @OneToMany(mappedBy = "resenia", cascade = CascadeType.ALL)
    private List<Notificacion> notificaciones = new ArrayList<>();
}
