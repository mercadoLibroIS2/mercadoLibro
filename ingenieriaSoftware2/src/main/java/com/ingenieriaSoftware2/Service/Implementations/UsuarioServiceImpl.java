package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.UsuarioRequestDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UsuarioServiceImpl implements UsuarioService {
    @Autowired
    private UsuarioRepository usuarioRepository;


    @Override
    public Usuario findByNombre(String username) {
        return null;
    }

    @Override
    public Usuario findByEmail(String email) {
        return null;
    }

    @Override
    public Optional<Usuario> findByNombreOEmail(String usernameOrEmail) {
        return Optional.empty();
    }

    @Override
    public boolean existsByNombre(String username) {
        return false;
    }

    @Override
    public boolean existsByEmail(String email) {
        return false;
    }

    @Override
    public Usuario save(Usuario user) {
        return null;
    }

    @Override
    public List<Usuario> findAll() {
        return List.of();
    }

    @Override
    public Usuario actualizarPerfil(Long userId, UsuarioRequestDTO request) {
        return null;
    }

    @Override
    public UserDetails loadUserByUsername(String nombre){
        Usuario usuario = usuarioRepository.findByNombre(nombre).orElseThrow(() -> new UsuarioNoEncontrado());
        return usuario;
    }
}
