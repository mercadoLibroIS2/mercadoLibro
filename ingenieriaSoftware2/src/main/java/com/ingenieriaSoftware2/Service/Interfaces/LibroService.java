package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.LibroRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface LibroService {
    LibroResponseDTO publicarLibro(LibroRequestDTO request, UUID usuarioId);
    LibroResponseDTO actualizarLibro(UUID libroId, LibroRequestDTO request, UUID usuarioId);
    void eliminarLibro(UUID libroId, UUID usuarioId);
    LibroResponseDTO obtenerLibroPorId(UUID libroId);
    Page<LibroResponseDTO> buscarLibros(String busqueda, String categoria, EstadoFisico estado, Integer precioMin, Integer precioMax, Pageable pageable);
    List<String> obtenerSugerencias(String consulta, Integer limite);
    boolean estaLibroDisponible(UUID libroId);
    void bloquearLibro(UUID libroId, UUID intercambioId);
    void liberarLibro(UUID libroId);
    void marcarComoIntercambiado(UUID libroId);
    List<LibroResponseDTO> obtenerLibrosDeUsuario(UUID usuarioId);
    Page<LibroResponseDTO> obtenerLibrosDisponibles(Pageable pageable);
}
