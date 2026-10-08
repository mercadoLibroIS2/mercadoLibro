package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.CambiarContraseniaRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.PerfilResponseDTO;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Exception.Libro.LibroNoExisteException;
import com.ingenieriaSoftware2.Exception.Usuario.ContraseniaIncorrecta;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Mapper.UsuarioMapper;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Security.PasswordConfig;
import com.ingenieriaSoftware2.Service.Interfaces.UsuarioService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;
import java.util.UUID;

@Service
public class UsuarioServiceImpl implements UsuarioService {
    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordConfig passwordConfig;

    @Autowired
    private UsuarioMapper usuarioMapper;

    @Autowired
    private LibroRepository libroRepository;

    @Autowired
    private LibroMapper libroMapper;


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

        if (!passwordConfig.passwordEncoder().matches(dto.contraseniaActual(), usuario.getContrasenia())) {
            throw new ContraseniaIncorrecta();
        }

        usuario.setContrasenia(passwordConfig.passwordEncoder().encode(dto.contraseniaNueva()));
        usuarioRepository.save(usuario);
    }

    @Override
    public PerfilResponseDTO buscarUsuarioPorNombre(String nombre){
        Usuario usuario = usuarioRepository.findByNombre(nombre).orElseThrow(()-> new UsuarioNoEncontrado());
        return usuarioMapper.toPerfilDTO(usuario);
    }

    @Override
    @Transactional
    public void seguirLibro(UUID usuarioId, String isbn) {
        Usuario usuario = usuarioRepository.findById(usuarioId).orElseThrow(()-> new UsuarioNoEncontrado());
        Libro libro = libroRepository.findByIsbn(isbn).orElseThrow(()-> new LibroNoExisteException());
        usuario.getLibrosSeguidos().add(libro);
    }

    @Override
    @Transactional
    public List<LibroResponseDTO> obtenerLibrosSeguidos(UUID usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId).orElseThrow(()-> new UsuarioNoEncontrado());
        return usuario.getLibrosSeguidos().stream().map(libroMapper::toDTO).toList();
    }

}
