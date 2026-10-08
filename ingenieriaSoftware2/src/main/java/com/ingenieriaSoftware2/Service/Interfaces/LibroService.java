package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Entity.Libro;

import java.util.List;
import java.util.Optional;

public interface LibroService {
    Optional<LibroResponseDTO> obtenerLibroPorIsbn(String isbn);
    Libro obtenerOCrearLibro(String isbn, String tituloOpcional, String autorOpcional);
    List<LibroResponseDTO> listarLibrosCatalogo();
}
