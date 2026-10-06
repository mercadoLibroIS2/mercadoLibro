package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.CambiarContraseniaRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.PerfilResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.List;
import java.util.UUID;

public interface UsuarioService extends UserDetailsService {
    PerfilResponseDTO verPerfilPropio();
    void cambiarContrasenia(CambiarContraseniaRequestDTO dto);
    Usuario getUsuarioActual();
    PerfilResponseDTO buscarUsuarioPorNombre(String nombre);
    void seguirLibro(UUID usuarioId, String isbn);
    List<LibroResponseDTO> obtenerLibrosSeguidos(UUID usuarioId);
}
