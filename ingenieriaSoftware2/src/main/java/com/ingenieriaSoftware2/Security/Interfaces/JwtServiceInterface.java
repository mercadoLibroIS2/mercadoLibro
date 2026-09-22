package com.ingenieriaSoftware2.Security.Interfaces;

import io.jsonwebtoken.Claims;
import org.springframework.security.core.userdetails.UserDetails;

import java.security.Key;
import java.util.Date;
import java.util.function.Function;

public interface JwtServiceInterface {
    String generarToken(UserDetails userDetails);
    String extraerNombreUsuario(String token);
    Date extraerFechaExpiracion(String token);
    Claims extraerTodosLosClaims(String token);
    <T> T extraerClaim(String token, Function<Claims, T> claimsResolver);
    boolean validarToken(String token, UserDetails userDetails);
    boolean tokenExpirado(String token);
    String refrescarToken(String token);
    Key obtenerClaveFirma();

}
