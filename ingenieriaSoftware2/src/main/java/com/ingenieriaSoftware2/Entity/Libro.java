package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Enums.CategoriaLibro;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.ingenieriaSoftware2.Entity.Usuario;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Libro {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String isbn;

    @Column(nullable = false)
    private String titulo;

    @Column(nullable = false)
    private String autor;

    @Column(nullable = false)
    private List<CategoriaLibro> categoria = new ArrayList<>();

    @Column(nullable = false)
    private EstadoFisico estadoFisico;

    @Column(nullable = false)
    private Integer valorReferencia;

    @Column(nullable = false)
    private Boolean disponible;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "propietario_id", nullable = false)
    private Usuario propietario;

}
