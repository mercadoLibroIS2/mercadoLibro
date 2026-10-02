package com.ingenieriaSoftware2.Entity;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.ingenieriaSoftware2.Enums.TipoMovimiento;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
        @JoinColumns({
            @JoinColumn(name = "isbn_solicitante", referencedColumnName = "isbn_solicitante", nullable = false),
            @JoinColumn(name = "isbn_ofrecida", referencedColumnName = "isbn_ofrecida", nullable = false),
            @JoinColumn(name = "id_solicitante", referencedColumnName = "id_solicitante", nullable = false),
            @JoinColumn(name = "id_ofrecido", referencedColumnName = "id_ofrecido", nullable = false)
        })
    private Intercambio intercambio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoMovimiento tipo;

    @Column(nullable = false)
    private int cantidad;

    @OneToMany(mappedBy = "movimientoPuntos", cascade = CascadeType.ALL)
    private List<Notificacion> notificaciones = new ArrayList<>();
}
