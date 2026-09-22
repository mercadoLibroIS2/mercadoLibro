package com.ingenieriaSoftware2.Security;

import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoAutenticadoException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class SecurityUtils {
    public Usuario obtenerUsuarioAutenticado() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UsuarioNoAutenticadoException();
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof Usuario) {
            return (Usuario) principal;
        }
        throw new UsuarioNoAutenticadoException();
    }
}
