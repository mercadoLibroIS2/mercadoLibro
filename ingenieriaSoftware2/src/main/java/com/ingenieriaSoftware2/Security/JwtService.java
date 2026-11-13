package com.ingenieriaSoftware2.Security;

import com.ingenieriaSoftware2.Security.Interfaces.JwtServiceInterface;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Slf4j
@Service
public class JwtService implements JwtServiceInterface {

    private String secreto = "miClaveSecretaSuperSeguraParaJWTConMasDe32Caracteres";
    private Long expiracion = 86400000L ;


    @Override
    public Key obtenerClaveFirma() {
        byte[] claveBytes = secreto.getBytes();
        return Keys.hmacShaKeyFor(claveBytes);
    }

    @Override
    public String generarToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("nombreUsuario", userDetails.getUsername());
        if (userDetails instanceof com.ingenieriaSoftware2.Entity.Usuario usuario) {
            if (usuario.getEmail() != null) {
                claims.put("email", usuario.getEmail());
            }
            if (usuario.getId() != null) {
                claims.put("userId", usuario.getId().toString());
            }
        }
        return crearToken(claims, userDetails.getUsername());
    }

    private String crearToken(Map<String, Object> claims, String subject) {
        Date ahora = new Date(System.currentTimeMillis());
        Date fechaExpiracion = new Date(System.currentTimeMillis() + expiracion);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(ahora)
                .setExpiration(fechaExpiracion)
                .signWith(obtenerClaveFirma(), SignatureAlgorithm.HS256)
                .compact();
    }

    @Override
    public String extraerNombreUsuario(String token) {
        return extraerClaim(token, Claims::getSubject);
    }

    @Override
    public Date extraerFechaExpiracion(String token) {
        return extraerClaim(token, Claims::getExpiration);
    }

    @Override
    public Claims extraerTodosLosClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(obtenerClaveFirma())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    @Override
    public <T> T extraerClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extraerTodosLosClaims(token);
        return claimsResolver.apply(claims);
    }

    @Override
    public boolean validarToken(String token, UserDetails userDetails) {
        final String nombreUsuario = extraerNombreUsuario(token);
        boolean coincideUsuario = nombreUsuario.equals(userDetails.getUsername());
        if (!coincideUsuario && userDetails instanceof com.ingenieriaSoftware2.Entity.Usuario usuario) {
            try {
                Claims claims = extraerTodosLosClaims(token);
                String emailClaim = claims.get("email", String.class);
                String userIdClaim = claims.get("userId", String.class);
                coincideUsuario = (emailClaim != null && emailClaim.equals(usuario.getEmail()))
                        || (userIdClaim != null && usuario.getId() != null && userIdClaim.equals(usuario.getId().toString()));
            } catch (Exception ignored) {
            }
        }
        return (coincideUsuario && !tokenExpirado(token));
    }

    @Override
    public boolean tokenExpirado(String token) {
        return extraerFechaExpiracion(token).before(new Date());
    }

    @Override
    public String refrescarToken(String token) {
        Claims claims = extraerTodosLosClaims(token);
        String nombreUsuario = extraerNombreUsuario(token);

        Map<String, Object> nuevosClaims = new HashMap<>(claims);
        nuevosClaims.remove("exp");
        nuevosClaims.remove("iat");

        return crearToken(nuevosClaims, nombreUsuario);
    }
}
