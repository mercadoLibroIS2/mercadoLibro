package com.ingenieriaSoftware2.Security;

import com.ingenieriaSoftware2.Security.Interfaces.JwtServiceInterface;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Slf4j
@Service
public class JwtService implements JwtServiceInterface {

    // Antes el secreto estaba fijo en el código (cualquiera con el repo podía firmar tokens).
    // Ahora sale de JWT_SECRET; si no está definido se genera uno aleatorio al arrancar
    // (los tokens dejan de valer al reiniciar, pero nadie puede falsificarlos).
    private final Key claveFirma;
    private final Long expiracion;

    public JwtService(@Value("${jwt.secret:}") String secreto,
                      @Value("${jwt.expiration:86400000}") Long expiracion) {
        this.expiracion = expiracion;
        if (secreto == null || secreto.getBytes(StandardCharsets.UTF_8).length < 32) {
            log.warn("JWT_SECRET no está definido o tiene menos de 32 bytes: se usa una clave aleatoria temporal.");
            this.claveFirma = Keys.secretKeyFor(SignatureAlgorithm.HS256);
        } else {
            this.claveFirma = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        }
    }

    @Override
    public Key obtenerClaveFirma() {
        return claveFirma;
    }

    @Override
    public String generarToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("nombreUsuario", userDetails.getUsername());
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
        return (nombreUsuario.equals(userDetails.getUsername()) && !tokenExpirado(token));
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
