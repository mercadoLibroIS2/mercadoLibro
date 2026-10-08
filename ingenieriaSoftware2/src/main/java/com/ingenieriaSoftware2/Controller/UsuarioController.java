package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.CambiarContraseniaRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.PerfilResponseDTO;
import com.ingenieriaSoftware2.Service.Interfaces.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/usuario")
@CrossOrigin(origins = "http://localhost:5173")
public class UsuarioController {
    @Autowired
    private UsuarioService usuarioService;

    @GetMapping("/me")
    public ResponseEntity<PerfilResponseDTO> verPerfilPropio() {
        return ResponseEntity.ok(usuarioService.verPerfilPropio());
    }

    @PutMapping("/me/contrasenia")
    public ResponseEntity<Void> cambiarContrasenia(@Valid @RequestBody CambiarContraseniaRequestDTO dto) {
        usuarioService.cambiarContrasenia(dto);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{nombre}")
    public ResponseEntity<PerfilResponseDTO> buscarUsuarioPorNombre(@PathVariable String nombre) {
        return ResponseEntity.ok(usuarioService.buscarUsuarioPorNombre(nombre));
    }

    @PostMapping("/{usuarioId}/libros-seguidos/{isbn}")
    public ResponseEntity<Void> seguirLibro(@PathVariable UUID usuarioId, @PathVariable String isbn) {
        usuarioService.seguirLibro(usuarioId, isbn);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{usuarioId}/libros-seguidos")
    public ResponseEntity<List<LibroResponseDTO>> obtenerLibrosSeguidos(@PathVariable UUID usuarioId) {
        return ResponseEntity.ok(usuarioService.obtenerLibrosSeguidos(usuarioId));
    }


}
