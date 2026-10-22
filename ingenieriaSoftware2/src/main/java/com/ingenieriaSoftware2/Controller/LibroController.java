package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.External.GoogleBookItemDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Service.Interfaces.LibroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/libro")
@CrossOrigin(origins = "*")
public class LibroController {

    @Autowired
    private LibroService libroService;

    @GetMapping("/isbn/{isbn}")
    public ResponseEntity<LibroResponseDTO> obtenerOConsultarPorIsbn(@PathVariable String isbn) {
        LibroResponseDTO libro = libroService.obtenerOConsultarPorIsbn(isbn);
        return ResponseEntity.ok(libro);
    }

    @GetMapping("/buscar-google")
    public ResponseEntity<List<GoogleBookItemDTO>> buscarEnGoogle(
            @RequestParam("q") String query,
            @RequestParam(value = "limite", defaultValue = "10") int limite
    ) {
        List<GoogleBookItemDTO> resultados = libroService.buscarLibrosEnGoogle(query, limite);
        return ResponseEntity.ok(resultados);
    }

    @PostMapping("/refrescar/{isbn}")
    public ResponseEntity<LibroResponseDTO> refrescarDesdeGoogleBooks(@PathVariable String isbn) {
        LibroResponseDTO libro = libroService.refrescarDesdeGoogleBooks(isbn);
        return ResponseEntity.ok(libro);
    }
}
