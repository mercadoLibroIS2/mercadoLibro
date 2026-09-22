package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.LibroRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.LibroService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class LibroServiceImpl implements LibroService {
    @Autowired
    private LibroRepository libroRepository;
    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private LibroMapper libroMapper;

    @Override
    @Transactional
    public LibroResponseDTO publicarLibro(LibroRequestDTO request, UUID usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId).orElseThrow(()-> new UsuarioNoEncontrado());
        Libro libro = new Libro();
        libro.setIsbn(request.isbn());
        libro.setCategoria(request.categoria());
        libro.setTitulo(request.titulo());
        libro.setAutor(request.autor());
        libro.setEstadoFisico(request.estadoFisico());
        libro.setValorReferencia(request.valorReferencia());
        libro.setDisponible(request.disponible());
        libro.setPropietario(usuario);
        Libro libroGuardado = libroRepository.save(libro);

        return libroMapper.toResponseDTO(libroGuardado);
    }

    @Override
    public LibroResponseDTO actualizarLibro(UUID libroId, LibroRequestDTO request, UUID usuarioId) {
        return null;
    }

    @Override
    public void eliminarLibro(UUID libroId, UUID usuarioId) {

    }

    @Override
    public LibroResponseDTO obtenerLibroPorId(UUID libroId) {
        return null;
    }

    @Override
    public Page<LibroResponseDTO> buscarLibros(String busqueda, String categoria, EstadoFisico estado, Integer precioMin, Integer precioMax, Pageable pageable) {
        return null;
    }

    @Override
    public List<String> obtenerSugerencias(String consulta, Integer limite) {
        return List.of();
    }

    @Override
    public boolean estaLibroDisponible(UUID libroId) {
        return false;
    }

    @Override
    public void bloquearLibro(UUID libroId, UUID intercambioId) {

    }

    @Override
    public void liberarLibro(UUID libroId) {

    }

    @Override
    public void marcarComoIntercambiado(UUID libroId) {

    }

    @Override
    public List<LibroResponseDTO> obtenerLibrosDeUsuario(UUID usuarioId) {
        return List.of();
    }

    @Override
    public Page<LibroResponseDTO> obtenerLibrosDisponibles(Pageable pageable) {
        return null;
    }
}
