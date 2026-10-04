package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Enums.Rol;
import com.ingenieriaSoftware2.Enums.EstadoCuenta;
import com.ingenieriaSoftware2.Enums.FrecuenciaNotificacion;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.jspecify.annotations.Nullable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.*;

@Entity
@Table(name = "usuario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Usuario implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id_usuario", nullable = false)
    private UUID id;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "nombre_usuario", unique = true, nullable = false)
    private String nombre;

    @Column(name = "contrasenia", nullable = false)
    private String contrasenia;

    @Column(name = "saldo_total", nullable = false)
    private Integer saldoTotal;
    @Column(name = "saldo_reservado", nullable = false)
    private Integer saldoReservado;
    @Column(name = "reputacion_promedio")
    private float reputacionPromedio;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "rol", columnDefinition = "rol_usuario")
    private Rol rol = Rol.USUARIO;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado_cuenta", columnDefinition = "estado_cuenta")
    private EstadoCuenta estadoCuenta = EstadoCuenta.ACTIVA;

    @Column(name = "notificacion_email")
    private boolean notificacionEmail = true;

    @Column(name = "notificacion_inapp")
    private boolean notificacionInapp = true;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "frecuencia_notificacion", columnDefinition = "frecuencia_notificacion")
    private FrecuenciaNotificacion frecuenciaNotificacion = FrecuenciaNotificacion.INSTANTANEA;

    @Column(name = "hora_resumen_diario")
    private java.time.LocalTime horaResumenDiario;

    @Transient
    private boolean esActivo;

    @OneToMany(mappedBy = "propietario")
    private List<Publicacion> publicaciones = new ArrayList<>();

    @Transient
    private List<OfertaIntercambio> ofertas = new ArrayList<>();

    @Transient
    private Set<CadenaIntercambio> cadenas = new HashSet<>();

    @OneToMany(mappedBy = "usuario")
    private List<MovimientoPuntosCompra> movimientosCompra = new ArrayList<>();

    @OneToMany(mappedBy = "usuario")
    private List<MovimientoPuntosIntercambio> movimientosIntercambio = new ArrayList<>();

    @OneToMany(mappedBy = "usuario")
    private List<MovimientoPuntosResenia> movimientosResenia = new ArrayList<>();

    @OneToMany(mappedBy = "usuario")
    private List<MovimientoPuntosSistema> movimientosSistema = new ArrayList<>();

    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Notificacion> notificaciones = new ArrayList<>();

    @OneToMany(mappedBy = "comprador")
    private List<Compra> comprasRealizadas = new ArrayList<>();

        @Transient
        private Set<Libro> librosSeguidos = new HashSet<>();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + rol.name()));
    }

    @Override
    public @Nullable String getPassword() {
        return contrasenia;
    }

    @Override
    public String getUsername() {
        return nombre;
    }
}
