package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Enums.TipoIntercambio;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Intercambio {
    @EmbeddedId
    private IntercambioId id;

    private Integer puntosComprometidos;

    @Enumerated(EnumType.STRING)
    private TipoIntercambio tipo;

    @Enumerated(EnumType.STRING)
    private EstadoIntercambio estado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "isbnOfrecida", nullable = false)
    private Libro libroOfrecido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "isbnSolicitante")
    private Libro libroSolicitante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "idSolicitante", nullable = false)
    private Usuario solicitante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "idOfrecida", nullable = false)
    private Usuario ofrecido;

    @ManyToOne
    private CadenaIntercambio cadena;

    @OneToMany(mappedBy = "intercambio", cascade = CascadeType.ALL)
    private List<MovimientoPuntos> movimientosPuntos = new ArrayList<>();

    @OneToMany(mappedBy = "intercambio", cascade = CascadeType.ALL)
    private List<Notificacion> notificaciones = new ArrayList<>();
}

