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
        if (auth.getPrincipal() instanceof Usuario usuario && usuario.getEmail() != null) {
            return usuario.getEmail();
        }
        String identificador = auth.getName();
        return usuarioRepository.findByNombreOrEmail(identificador, identificador)
                .map(Usuario::getEmail)
                .orElse(identificador);
    }

    /** Usuario logueado completo, buscado en la base. */
    public Usuario getUsuarioLogueado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No hay un usuario logueado");
        }
        if (auth.getPrincipal() instanceof Usuario usuario && usuario.getId() != null) {
            return usuarioRepository.findById(usuario.getId())
                    .orElse(usuario);
        }
        String identificador = auth.getName();
        return usuarioRepository.findByNombreOrEmail(identificador, identificador)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "El usuario del token no existe"));
    }

    /** UUID del usuario logueado. */
    public UUID getUsuarioIdLogueado() {
        return getUsuarioLogueado().getId();
    }
}
