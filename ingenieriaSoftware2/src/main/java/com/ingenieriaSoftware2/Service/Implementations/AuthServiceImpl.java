package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.LoginRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.UsuarioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.AuthResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.Rol;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioYaExiste;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Security.JwtService;
import com.ingenieriaSoftware2.Service.Interfaces.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {

    private Integer puntosIniciales = 100;

    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private AuthenticationManager authenticationManager;


    @Override
    public AuthResponseDTO registrar(UsuarioRequestDTO usuarioRequestDTO) {
        if (usuarioRepository.existsByNombre(usuarioRequestDTO.nombre())||(usuarioRepository.existsByEmail(usuarioRequestDTO.email()))){
            throw new UsuarioYaExiste();
        }
        Usuario usuario = new Usuario();
        usuario.setNombre(usuarioRequestDTO.nombre());
        usuario.setEmail(usuarioRequestDTO.email());
        usuario.setContrasenia(passwordEncoder.encode(usuarioRequestDTO.contrasenia()));
        usuario.setRol(Rol.USUARIO);
        usuario.setSaldoTotal(puntosIniciales);
        usuario.setSaldoReservado(0);
        usuario.setReputacionPromedio(0.0F);
        usuario.setEsActivo(true);

        Usuario usuarioGuardado = usuarioRepository.save(usuario);
        String token = jwtService.generarToken((UserDetails) usuarioGuardado);
        return new AuthResponseDTO(
                usuario.getId(),
                token,
                usuarioGuardado.getNombre(),
                usuarioGuardado.getEmail(),
                usuarioGuardado.getRol().name(),
                usuarioGuardado.getSaldoTotal()
        );
    }

    @Override
    public AuthResponseDTO login(LoginRequestDTO loginRequestDTO) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequestDTO.nombreOEmail(),
                            loginRequestDTO.contrasenia()
                    )
            );

            Usuario usuario = usuarioRepository.findByNombreOrEmail(
                            loginRequestDTO.nombreOEmail(),
                            loginRequestDTO.nombreOEmail()
                    )
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            if (!usuario.isEsActivo()) {
                throw new BadCredentialsException("Usuario desactivado");
            }

            String token = jwtService.generarToken((UserDetails) usuario);

            return new AuthResponseDTO(
                    usuario.getId(),
                    token,
                    usuario.getNombre(),
                    usuario.getEmail(),
                    usuario.getRol().name(),
                    usuario.getSaldoTotal()
            );

        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Credenciales inválidas");
        }
    }

    @Override
    public void logout(String token) {
    }

    @Override
    public boolean validarToken(String token) {
        try {
            String nombreUsuario = jwtService.extraerNombreUsuario(token);
            Usuario usuario;
            usuario = usuarioRepository.findByNombre(nombreUsuario)
                    .orElseThrow(() -> new UsuarioNoEncontrado());

            return jwtService.validarToken(token, (UserDetails) usuario);
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public AuthResponseDTO refrescarTocken(String token) {
        if (!validarToken(token)) {
            throw new BadCredentialsException("Token inválido");
        }

        String nombreUsuario = jwtService.extraerNombreUsuario(token);
        Usuario usuario = usuarioRepository.findByNombre(nombreUsuario)
                .orElseThrow(() -> new UsuarioNoEncontrado());

        String nuevoToken = jwtService.refrescarToken(token);

        return new AuthResponseDTO(
                usuario.getId(),
                nuevoToken,
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.getRol().name(),
                usuario.getSaldoTotal()
        );
    }
}
