package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
    Optional<Usuario> findByNombre(String nombre);

    Optional<Usuario> findByEmail(String email);

    Optional<Usuario> findByNombreOrEmail(String nombre, String email);

    boolean existsByNombre(String nombre);

    boolean existsByEmail(String email);
}
