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
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

@Slf4j
@Service
public class JwtService implements JwtServiceInterface {

    private String secreto = "miClaveSecretaSuperSeguraParaJWTConMasDe32Caracteres";
    private Long expiracion = 86400000L ;
    private final Set<String> tokensRevocados = ConcurrentHashMap.newKeySet();

    public void revocarToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }

        String tokenNormalizado = token.trim();
        if (tokenNormalizado.startsWith("Bearer ")) {
            tokenNormalizado = tokenNormalizado.substring(7);
        }

        try {
            String nombreUsuario = extraerNombreUsuario(tokenNormalizado);
            if (nombreUsuario != null && !nombreUsuario.isBlank()) {
                tokensRevocados.add(tokenNormalizado);
            }
        } catch (Exception ignored) {
            tokensRevocados.add(tokenNormalizado);
        }
    }

    public boolean estaRevocado(String token) {
        if (token == null || token.isBlank()) {
            return true;
        }

        String tokenNormalizado = token.trim();
        if (tokenNormalizado.startsWith("Bearer ")) {
            tokenNormalizado = tokenNormalizado.substring(7);
        }

        return tokensRevocados.contains(tokenNormalizado);
    }

    @Override
    public Key obtenerClaveFirma() {
        byte[] claveBytes = secreto.getBytes();
        return Keys.hmacShaKeyFor(claveBytes);
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
        if (token == null || token.isBlank() || estaRevocado(token)) {
            return false;
        }

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
