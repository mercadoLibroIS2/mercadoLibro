package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.UsuarioRequestDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.List;
import java.util.Optional;

public interface UsuarioService extends UserDetailsService {
    Usuario findByNombre(String username);

    Usuario findByEmail(String email);

    Optional<Usuario> findByNombreOEmail(String usernameOrEmail);

    boolean existsByNombre(String username);

    boolean existsByEmail(String email);

    Usuario save(Usuario user);

    List<Usuario> findAll();

    Usuario actualizarPerfil(Long userId, UsuarioRequestDTO request);
}
