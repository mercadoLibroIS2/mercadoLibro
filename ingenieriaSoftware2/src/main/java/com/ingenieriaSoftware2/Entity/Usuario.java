package com.ingenieriaSoftware2.Entity;

import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Enums.Rol;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.jspecify.annotations.Nullable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Usuario implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(unique = true, nullable = false)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true, nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String contrasenia;

    private Integer saldoTotal;
    private Integer saldoReservado;
    private float reputacionPromedio;

    @Enumerated(EnumType.STRING)
    private Rol rol = Rol.USUARIO;

    private boolean esActivo;

    @OneToMany(mappedBy = "propietario")
    private List<Publicacion> publicaciones = new ArrayList<>();

    @OneToMany(mappedBy = "usuario")
    private List<OfertaIntercambio> ofertas = new ArrayList<>();

    @ManyToMany(mappedBy = "participantes")
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

    @ManyToMany
    @JoinTable(
            name = "seguimiento",
            joinColumns = @JoinColumn(name = "email_usuario", referencedColumnName = "email"),
            inverseJoinColumns = @JoinColumn(name = "isbn", referencedColumnName = "isbn")
    )
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
