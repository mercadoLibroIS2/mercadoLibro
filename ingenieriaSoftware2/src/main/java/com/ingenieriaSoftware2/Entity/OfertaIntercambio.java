package com.ingenieriaSoftware2.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class OfertaIntercambio {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "libro_ofrecido_id", nullable = false)
    private Libro libroOfrecido;

    @ManyToMany
    @JoinTable(
            name = "oferta_libros_deseados",
            joinColumns = @JoinColumn(name = "oferta_id"),
            inverseJoinColumns = @JoinColumn(name = "libro_id")
    )
    private List<Libro> librosDeseados = new ArrayList<>();

    private Integer puntosSolicitados;

    private Integer precioMin;

    private Integer precioMax;
}
