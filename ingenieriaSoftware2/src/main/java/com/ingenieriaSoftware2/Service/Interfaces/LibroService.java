package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.External.GoogleBookItemDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;

import java.util.List;

public interface LibroService {
    LibroResponseDTO obtenerOConsultarPorIsbn(String isbn);
    LibroResponseDTO refrescarDesdeGoogleBooks(String isbn);
    List<GoogleBookItemDTO> buscarLibrosEnGoogle(String consulta, int limite);
}
