package com.ingenieriaSoftware2.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Un eslabón de una cadena circular: el usuario {@code emailEntrega} entrega su publicación
 * (isbn + horaPublicacion) al usuario {@code emailRecibe}. Cada participante entrega
 * exactamente un libro y recibe exactamente uno.
 */
@Entity
@Table(name = "cadena_paso")
@Getter
@Setter
@NoArgsConstructor
public class CadenaPaso {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cadena_id", nullable = false)
    private CadenaIntercambio cadena;

    @Column(name = "orden", nullable = false)
    private Integer orden;

    @Column(name = "email_entrega", nullable = false)
    private String emailEntrega;

    @Column(name = "email_recibe", nullable = false)
    private String emailRecibe;

    @Column(name = "isbn", nullable = false)
    private String isbn;

    @Column(name = "hora_publicacion", nullable = false)
    private LocalDateTime horaPublicacion;

    @Column(name = "confirmado", nullable = false)
    private boolean confirmado;
}
