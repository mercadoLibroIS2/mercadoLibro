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

    /**
     * Usuario logueado completo, buscado en la base.
     * El filtro JWT guarda como "username" el NOMBRE de usuario (Usuario.getUsername() devuelve nombre),
     * así que se busca por nombre y no por email.
     */
    public Usuario getUsuarioLogueado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No hay un usuario logueado");
        }
        if (auth.getPrincipal() instanceof Usuario principal && principal.getId() != null) {
            return usuarioRepository.findById(principal.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                            "El usuario del token no existe"));
        }
        return usuarioRepository.findByNombre(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "El usuario del token no existe"));
    }

    /** Email del usuario logueado. */
    public String getEmailUsuarioLogueado() {
        return getUsuarioLogueado().getEmail();
    }

    /** UUID del usuario logueado. */
    public UUID getUsuarioIdLogueado() {
        return getUsuarioLogueado().getId();
    }
}
