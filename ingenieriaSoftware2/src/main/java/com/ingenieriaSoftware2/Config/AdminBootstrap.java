package com.ingenieriaSoftware2.Config;

import com.ingenieriaSoftware2.Enums.Rol;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;

/**
 * Da rol ADMINISTRADOR a las cuentas listadas en APP_ADMIN_EMAILS (separadas por coma)
 * al arrancar, y a las que se registren con esos emails más adelante.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrap implements ApplicationRunner {

    private final UsuarioRepository usuarioRepository;

    @Value("${app.admin-emails:}")
    private String adminEmails;

    /** true si el email está en APP_ADMIN_EMAILS (se usa también al registrarse). */
    public boolean esAdminConfigurado(String email) {
        return email != null && Arrays.stream(adminEmails.split(","))
                .map(String::trim)
                .anyMatch(e -> !e.isEmpty() && e.equalsIgnoreCase(email.trim()));
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Arrays.stream(adminEmails.split(","))
                .map(String::trim)
                .filter(e -> !e.isEmpty())
                .forEach(email -> usuarioRepository.findByEmail(email).ifPresent(u -> {
                    if (u.getRol() != Rol.ADMINISTRADOR) {
                        u.setRol(Rol.ADMINISTRADOR);
                        usuarioRepository.save(u);
                        log.info("Rol ADMINISTRADOR asignado a {}", email);
                    }
                }));
    }
}
