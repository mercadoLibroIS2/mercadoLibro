package com.ingenieriaSoftware2.Security;

import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoAutenticadoException;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class SecurityUtils {

    private final UsuarioRepository usuarioRepository;

    /** Email del usuario logueado (lo que el filtro JWT guardó como "username"). */
    public String getEmailUsuarioLogueado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No hay un usuario logueado");
        }
        return auth.getName();
    }

    /** Usuario logueado completo, buscado en la base. */
    public Usuario getUsuarioLogueado() {
        String email = getEmailUsuarioLogueado();
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "El usuario del token no existe"));
    }

    /** UUID del usuario logueado. */
    public UUID getUsuarioIdLogueado() {
        return getUsuarioLogueado().getId();
    }
}
