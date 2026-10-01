package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.CambiarContraseniaRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.UsuarioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.PerfilResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Exception.Usuario.ContraseniaIncorrecta;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.UsuarioMapper;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UsuarioServiceImpl implements UsuarioService {
    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UsuarioMapper usuarioMapper;


    @Override
    public UserDetails loadUserByUsername(String nombre){
        Usuario usuario = usuarioRepository.findByNombre(nombre).orElseThrow(() -> new UsuarioNoEncontrado());
        return usuario;
    }

    @Override
    public Usuario getUsuarioActual() {
        String nombre = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioRepository.findByNombre(nombre).orElseThrow(UsuarioNoEncontrado::new);
    }

    @Override
    public PerfilResponseDTO verPerfilPropio() {
        return usuarioMapper.toPerfilDTO(getUsuarioActual());
    }

    @Override
    public void cambiarContrasenia(CambiarContraseniaRequestDTO dto) {
        Usuario usuario = getUsuarioActual();

        if (!passwordEncoder.matches(dto.contraseniaActual(), usuario.getContrasenia())) {
            throw new ContraseniaIncorrecta();
        }

        usuario.setContrasenia(passwordEncoder.encode(dto.contraseniaNueva()));
        usuarioRepository.save(usuario);
    }
}
