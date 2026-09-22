package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.LoginRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.UsuarioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.AuthResponseDTO;

public interface AuthService {
    AuthResponseDTO registrar(UsuarioRequestDTO usuarioRequestDTO);
    AuthResponseDTO login(LoginRequestDTO loginRequestDTO);
    void logout(String token);
    boolean validarToken(String token);
    AuthResponseDTO refrescarTocken (String token);
}
