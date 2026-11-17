package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.Enums.EstadoFisico;
import java.util.Map;

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

    /**
     * Valor de referencia que el backend usará para el semáforo si se publica este ISBN en ese
     * estado, y la categoría que ya tiene el libro. 404 si el libro todavía no está en la base
     * (se importa al publicarlo por primera vez).
     */
    @GetMapping("/{isbn}/referencia")
    public ResponseEntity<Map<String, Object>> obtenerReferencia(@PathVariable String isbn,
                                                                 @RequestParam EstadoFisico estadoFisico) {
        return ResponseEntity.ok(libroService.obtenerReferencia(isbn, estadoFisico));
    }

    @GetMapping("/google-books/buscar")
    public ResponseEntity<List<GoogleBookVolumeDTO>> buscarGoogleBooksPorTexto(
            @RequestParam String query,
            @RequestParam(defaultValue = "10") int limite) {
        return ResponseEntity.ok(googleBooksService.buscarPorTexto(query, limite));
    }

}
