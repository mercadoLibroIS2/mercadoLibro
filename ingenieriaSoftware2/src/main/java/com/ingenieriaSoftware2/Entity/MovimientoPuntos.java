package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Enums.TipoMovimiento;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class MovimientoPuntos {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "intercambio_id", nullable = false)
    private Intercambio intercambio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoMovimiento tipo;

    @Column(nullable = false)
    private int cantidad;

    @OneToMany(mappedBy = "movimientoPuntos", cascade = CascadeType.ALL)
    private List<Notificacion> notificaciones = new ArrayList<>();
}
