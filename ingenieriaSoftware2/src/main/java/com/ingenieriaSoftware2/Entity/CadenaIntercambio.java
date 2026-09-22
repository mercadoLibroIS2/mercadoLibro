package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Enums.EstadoCadena;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.*;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CadenaIntercambio {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private Integer puntosBonus;

    @Enumerated(EnumType.STRING)
    private EstadoCadena estado;

    @OneToMany(mappedBy = "cadena")
    private List<Intercambio> intercambios = new ArrayList<>();

    @ManyToMany
    @JoinTable(
            name = "cadena_participantes",
            joinColumns = @JoinColumn(name = "cadena_id"),
            inverseJoinColumns = @JoinColumn(name = "usuario_id")
    )
    private Set<Usuario> participantes = new HashSet<>();
}
