package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.LibroRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.GoogleBookVolumeDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Security.SecurityUtils;
import com.ingenieriaSoftware2.Service.Interfaces.GoogleBooksService;
import com.ingenieriaSoftware2.Service.Interfaces.LibroService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/libro")
@CrossOrigin(origins = "http://localhost:5173")
public class LibroController {

    @Autowired
    private LibroService libroService;

    @Autowired
    private GoogleBooksService googleBooksService;

    @Autowired
    private SecurityUtils securityUtils;

    @PostMapping("/publicar")
    public ResponseEntity<LibroResponseDTO> publicarLibro(@Valid @RequestBody LibroRequestDTO request) {
        UUID usuarioId = securityUtils.obtenerUsuarioAutenticado().getId();
        LibroResponseDTO response = libroService.publicarLibro(request, usuarioId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Page<LibroResponseDTO>> obtenerCatalogo(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(libroService.obtenerLibrosDisponibles(pageable));
    }

    @GetMapping("/catalogo")
    public ResponseEntity<Page<LibroResponseDTO>> obtenerLibrosCatalogo(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(libroService.obtenerLibrosDisponibles(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LibroResponseDTO> obtenerLibroPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(libroService.obtenerLibroPorId(id));
    }

    @GetMapping("/buscar")
    public ResponseEntity<Page<LibroResponseDTO>> buscarLibros(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) EstadoFisico estado,
            @RequestParam(required = false) Integer precioMin,
            @RequestParam(required = false) Integer precioMax,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(libroService.buscarLibros(query, categoria, estado, precioMin, precioMax, pageable));
    }

    @GetMapping("/sugerencias")
    public ResponseEntity<List<String>> obtenerSugerencias(
            @RequestParam String query,
            @RequestParam(defaultValue = "5") Integer limite) {
        return ResponseEntity.ok(libroService.obtenerSugerencias(query, limite));
    }

    @GetMapping("/mis-libros")
    public ResponseEntity<List<LibroResponseDTO>> obtenerMisLibros() {
        UUID usuarioId = securityUtils.obtenerUsuarioAutenticado().getId();
        return ResponseEntity.ok(libroService.obtenerLibrosDeUsuario(usuarioId));
    }

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<List<LibroResponseDTO>> obtenerLibrosDeUsuario(@PathVariable UUID usuarioId) {
        return ResponseEntity.ok(libroService.obtenerLibrosDeUsuario(usuarioId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LibroResponseDTO> actualizarLibro(
            @PathVariable UUID id,
            @Valid @RequestBody LibroRequestDTO request) {
        UUID usuarioId = securityUtils.obtenerUsuarioAutenticado().getId();
        return ResponseEntity.ok(libroService.actualizarLibro(id, request, usuarioId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarLibro(@PathVariable UUID id) {
        UUID usuarioId = securityUtils.obtenerUsuarioAutenticado().getId();
        libroService.eliminarLibro(id, usuarioId);
        return ResponseEntity.noContent().build();
    }

    // ========== GOOGLE BOOKS ENDPOINTS ==========

    @GetMapping("/google-books/isbn/{isbn}")
    public ResponseEntity<GoogleBookVolumeDTO> buscarGoogleBooksPorIsbn(@PathVariable String isbn) {
        return googleBooksService.buscarPorIsbn(isbn)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/google-books/buscar")
    public ResponseEntity<List<GoogleBookVolumeDTO>> buscarGoogleBooksPorTexto(
            @RequestParam String query,
            @RequestParam(defaultValue = "10") Integer limite) {
        return ResponseEntity.ok(googleBooksService.buscarPorTexto(query, limite));
    }
}
