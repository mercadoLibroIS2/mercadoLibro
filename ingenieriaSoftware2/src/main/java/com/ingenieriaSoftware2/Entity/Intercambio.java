package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Intercambio {
    @EmbeddedId
    IntercambioId intercambioId;

    private Integer puntosComprometidos;

    @Enumerated(EnumType.STRING)
    private EstadoIntercambio estado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "libro_deseado_id", nullable = false)
    private Libro libroDeseado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "libro_ofrecido_id")
    private Libro libroOfrecido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prestador_id", nullable = false)
    private Usuario prestador;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receptor_id", nullable = false)
    private Usuario receptor;

    @ManyToOne
    private CadenaIntercambio cadena;

    @OneToMany(mappedBy = "intercambio", cascade = CascadeType.ALL)
    private List<MovimientoPuntos> movimientosPuntos = new ArrayList<>();

    @OneToMany(mappedBy = "intercambio", cascade = CascadeType.ALL)
    private List<Notificacion> notificaciones = new ArrayList<>();

}

