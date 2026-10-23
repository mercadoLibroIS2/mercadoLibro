package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.LibroRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.GoogleBookVolumeDTO;
import com.ingenieriaSoftware2.Security.SecurityUtils;
import com.ingenieriaSoftware2.Service.Interfaces.GoogleBooksService;
import com.ingenieriaSoftware2.Service.Interfaces.LibroService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/libro")
@CrossOrigin(origins = "http://localhost:5173")
public class LibroController {

    @Autowired
    private LibroService libroService;
    @Autowired
    private SecurityUtils securityUtils;
    @Autowired
    private GoogleBooksService googleBooksService;

    @GetMapping("/google-books/isbn/{isbn}")
    public ResponseEntity<GoogleBookVolumeDTO> buscarGoogleBooksPorIsbn(@PathVariable String isbn) {
        return googleBooksService.buscarPorIsbn(isbn)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/google-books/buscar")
    public ResponseEntity<List<GoogleBookVolumeDTO>> buscarGoogleBooksPorTexto(
            @RequestParam String query,
            @RequestParam(defaultValue = "10") int limite) {
        return ResponseEntity.ok(googleBooksService.buscarPorTexto(query, limite));
    }

}
