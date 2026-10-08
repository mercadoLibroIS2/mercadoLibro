package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Enums.CategoriaLibro;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.ingenieriaSoftware2.Entity.Usuario;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Libro {

    @Id
    @Column(name = "isbn")
    private String isbn;

    @Column(name = "google_books_id", nullable = false, unique = true)
    private String googleBooksId;

    @Column(name = "titulo", nullable = false)
    private String titulo;

    @Column(name = "autores")
    private String autores;

    @DecimalMin("0.0")
    @DecimalMax("5.0")
    private BigDecimal puntuacionExterna;
    private Integer valorReferencia;

    // Frescura del cache, independiente para cada tipo de dato
    @Column(name = "fecha_cache_bibliografico")
    private LocalDateTime fechaCacheBibliografico;

    @Column(name = "fecha_cache_puntuacion")
    private LocalDateTime fechaCachePuntuacion;

    @ManyToMany
    @JoinTable(
            name = "libro_categoria",
            joinColumns = @JoinColumn(name = "isbn", referencedColumnName = "isbn"),
            inverseJoinColumns = @JoinColumn(name = "nombre_categoria", referencedColumnName = "nombre")
    )
    private Set<Categoria> categorias = new HashSet<>();

    // ---- Usuarios que siguen este libro (lado inverso de Usuario.librosSeguidos) ----
    @ManyToMany(mappedBy = "librosSeguidos")
    private Set<Usuario> seguidores = new HashSet<>();

    // ---- Lado inverso (opcional, no agrega columnas) ----
    @OneToMany(mappedBy = "libro")
    private List<Publicacion> publicaciones = new ArrayList<>();
}
