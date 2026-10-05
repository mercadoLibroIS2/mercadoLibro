package com.ingenieriaSoftware2.Mapper;

import com.ingenieriaSoftware2.DTO.Response.PerfilResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import org.springframework.stereotype.Component;

@Component
public class UsuarioMapper {
    public PerfilResponseDTO toPerfilDTO(Usuario usuario) {
        return new PerfilResponseDTO(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.getRol().name(),
                usuario.getSaldoTotal(),
                usuario.getSaldoReservado(),
                usuario.getSaldoTotal() - usuario.getSaldoReservado(),
                usuario.getReputacionPromedio()
        );
    }
}
