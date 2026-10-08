package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Response.GoogleBookVolumeDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Service.Interfaces.GoogleBooksService;
import com.ingenieriaSoftware2.Service.Interfaces.LibroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/libro")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class LibroController {

    @Autowired
    private LibroService libroService;

    @Autowired
    private GoogleBooksService googleBooksService;

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

    // ========== CATALOGO DE LIBROS ==========

    @GetMapping("/{isbn}")
    public ResponseEntity<LibroResponseDTO> obtenerLibroPorIsbn(@PathVariable String isbn) {
        return libroService.obtenerLibroPorIsbn(isbn)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/catalogo")
    public ResponseEntity<List<LibroResponseDTO>> obtenerCatalogoLibros() {
        return ResponseEntity.ok(libroService.listarLibrosCatalogo());
    }
}
