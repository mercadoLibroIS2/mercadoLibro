package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.LibroRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.CategoriaLibro;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.LibroMapper;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.LibroService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Collections;
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
        Usuario usuario = usuarioRepository.findById(usuarioId).orElseThrow(UsuarioNoEncontrado::new);
        Libro libro = new Libro();
        libro.setIsbn(request.isbn());
        libro.setCategoria(request.categoria() != null ? request.categoria() : List.of());
        libro.setTitulo(request.titulo());
        libro.setAutor(request.autor());
        libro.setEstadoFisico(request.estadoFisico());
        libro.setValorReferencia(request.valorReferencia());
        libro.setDisponible(request.disponible() != null ? request.disponible() : true);
        libro.setPropietario(usuario);
        Libro libroGuardado = libroRepository.save(libro);

        return libroMapper.toResponseDTO(libroGuardado);
    }

    @Override
    @Transactional
    public LibroResponseDTO actualizarLibro(UUID libroId, LibroRequestDTO request, UUID usuarioId) {
        Libro libro = libroRepository.findById(libroId)
                .orElseThrow(() -> new IllegalArgumentException("Libro no encontrado con ID: " + libroId));

        if (!libro.getPropietario().getId().equals(usuarioId)) {
            throw new IllegalStateException("No tenés permiso para modificar un libro que no te pertenece");
        }

        libroMapper.updateEntity(libro, request);
        if (request.categoria() != null) {
            libro.setCategoria(request.categoria());
        }
        if (request.disponible() != null) {
            libro.setDisponible(request.disponible());
        }

        Libro actualizado = libroRepository.save(libro);
        return libroMapper.toResponseDTO(actualizado);
    }

    @Override
    @Transactional
    public void eliminarLibro(UUID libroId, UUID usuarioId) {
        Libro libro = libroRepository.findById(libroId)
                .orElseThrow(() -> new IllegalArgumentException("Libro no encontrado con ID: " + libroId));

        if (!libro.getPropietario().getId().equals(usuarioId)) {
            throw new IllegalStateException("No tenés permiso para eliminar un libro ajeno");
        }

        if (!Boolean.TRUE.equals(libro.getDisponible())) {
            throw new IllegalStateException("No se puede eliminar un libro con intercambio en curso o no disponible");
        }

        libroRepository.delete(libro);
    }

    @Override
    public LibroResponseDTO obtenerLibroPorId(UUID libroId) {
        Libro libro = libroRepository.findById(libroId)
                .orElseThrow(() -> new IllegalArgumentException("Libro no encontrado con ID: " + libroId));
        return libroMapper.toResponseDTO(libro);
    }

    @Override
    public Page<LibroResponseDTO> buscarLibros(String busqueda, String categoria, EstadoFisico estado, Integer precioMin, Integer precioMax, Pageable pageable) {
        CategoriaLibro catEnum = null;
        if (categoria != null && !categoria.trim().isEmpty()) {
            try {
                catEnum = CategoriaLibro.valueOf(categoria.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }

        String queryParam = (busqueda != null && !busqueda.trim().isEmpty()) ? busqueda.trim() : null;
        Page<Libro> pagina = libroRepository.buscarConFiltros(queryParam, catEnum, estado, precioMin, precioMax, pageable);
        return libroMapper.toResponseDTOPage(pagina);
    }

    @Override
    public List<String> obtenerSugerencias(String consulta, Integer limite) {
        if (consulta == null || consulta.trim().isEmpty()) {
            return Collections.emptyList();
        }
        int max = (limite != null && limite > 0) ? limite : 5;
        return libroRepository.findSuggestionsByTitulo(consulta.trim(), PageRequest.of(0, max));
    }

    @Override
    public boolean estaLibroDisponible(UUID libroId) {
        return libroRepository.findById(libroId)
                .map(Libro::getDisponible)
                .orElse(false);
    }

    @Override
    @Transactional
    public void bloquearLibro(UUID libroId, UUID intercambioId) {
        Libro libro = libroRepository.findById(libroId)
                .orElseThrow(() -> new IllegalArgumentException("Libro no encontrado con ID: " + libroId));
        libro.setDisponible(false);
        libroRepository.save(libro);
    }

    @Override
    @Transactional
    public void liberarLibro(UUID libroId) {
        Libro libro = libroRepository.findById(libroId)
                .orElseThrow(() -> new IllegalArgumentException("Libro no encontrado con ID: " + libroId));
        libro.setDisponible(true);
        libroRepository.save(libro);
    }

    @Override
    @Transactional
    public void marcarComoIntercambiado(UUID libroId) {
        Libro libro = libroRepository.findById(libroId)
                .orElseThrow(() -> new IllegalArgumentException("Libro no encontrado con ID: " + libroId));
        libro.setDisponible(false);
        libroRepository.save(libro);
    }

    @Override
    public List<LibroResponseDTO> obtenerLibrosDeUsuario(UUID usuarioId) {
        List<Libro> libros = libroRepository.findByPropietarioId(usuarioId);
        return libroMapper.toResponseDTOList(libros);
    }

    @Override
    public Page<LibroResponseDTO> obtenerLibrosDisponibles(Pageable pageable) {
        Page<Libro> libros = libroRepository.findByDisponibleTrue(pageable);
        return libroMapper.toResponseDTOPage(libros);
    }
}
