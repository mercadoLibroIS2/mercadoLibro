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
    private UUID id;

    @Column(unique = true)
    private String nombre;

    @Column(nullable = false)
    private String contrasenia;

    @Column(unique = true, nullable = false)
    private String email;
    private Integer saldoTotal;
    private Integer saldoReservado;
    private float reputacionPromedio;

    @Enumerated(EnumType.STRING)
    private Rol rol = Rol.USUARIO;

    private boolean esActivo;

    @OneToMany(mappedBy = "propietario")
    private List<Libro> libros = new ArrayList<>();

    @OneToMany(mappedBy = "prestador")
    private List<Intercambio> intercambiosRealizados = new ArrayList<>();

    @OneToMany(mappedBy = "receptor")
    private List<Intercambio> intercambiosRecibidos = new ArrayList<>();

    @OneToMany(mappedBy = "usuario")
    private List<OfertaIntercambio> ofertas = new ArrayList<>();

    @ManyToMany(mappedBy = "participantes")
    private Set<CadenaIntercambio> cadenas = new HashSet<>();

    @OneToMany(mappedBy = "autor")
    private List<Resenia> reseniasEscritas = new ArrayList<>();

    @OneToMany(mappedBy = "calificado")
    private List<Resenia> reseniasRecibidas = new ArrayList<>();

    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MovimientoPuntos> movimientosPuntos = new ArrayList<>();

    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Notificacion> notificaciones = new ArrayList<>();

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
