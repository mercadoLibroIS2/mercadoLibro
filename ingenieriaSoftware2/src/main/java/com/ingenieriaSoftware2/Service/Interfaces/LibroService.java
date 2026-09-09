package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.LibroRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface LibroService {
    LibroResponseDTO publicarLibro(LibroRequestDTO request, String email);
    LibroResponseDTO actualizarLibro(String isbn, LibroRequestDTO request, String email);
    void eliminarLibro(String isbn, String email);
    LibroResponseDTO obtenerLibroPorId(String isbn);
    Page<LibroResponseDTO> buscarLibros(String busqueda, String categoria, EstadoFisico estado, Integer precioMin, Integer precioMax, Pageable pageable);
    List<String> obtenerSugerencias(String consulta, Integer limite);
    boolean estaLibroDisponible(String isbn);
    void bloquearLibro(String isbn, IntercambioId intercambioId);
    void liberarLibro(String isbn);
    void marcarComoIntercambiado(String isbn);
    List<LibroResponseDTO> obtenerLibrosDeUsuario(String email);
    Page<LibroResponseDTO> obtenerLibrosDisponibles(Pageable pageable);
}
