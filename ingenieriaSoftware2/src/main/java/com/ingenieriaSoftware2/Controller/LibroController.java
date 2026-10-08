package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Response.GoogleBookVolumeDTO;
import com.ingenieriaSoftware2.Security.SecurityUtils;
import com.ingenieriaSoftware2.Service.Interfaces.GoogleBooksService;
import com.ingenieriaSoftware2.Service.Interfaces.LibroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        return googleBooksService.buscarPorTexto(query, limite);
    }
}
