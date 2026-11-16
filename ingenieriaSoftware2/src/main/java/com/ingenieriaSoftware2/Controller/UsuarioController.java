package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.CambiarContraseniaRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.PerfilResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Service.Interfaces.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    // El usuario sale del token: no se puede leer ni modificar la lista de otra persona.
    @PostMapping("/me/libros-seguidos/{isbn}")
    public ResponseEntity<Void> seguirLibro(@AuthenticationPrincipal Usuario usuario, @PathVariable String isbn) {
        usuarioService.seguirLibro(usuario.getId(), isbn);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/me/libros-seguidos/{isbn}")
    public ResponseEntity<Void> dejarDeSeguirLibro(@AuthenticationPrincipal Usuario usuario, @PathVariable String isbn) {
        usuarioService.dejarDeSeguirLibro(usuario.getId(), isbn);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/libros-seguidos")
    public ResponseEntity<List<LibroResponseDTO>> obtenerLibrosSeguidos(@AuthenticationPrincipal Usuario usuario) {
        return ResponseEntity.ok(usuarioService.obtenerLibrosSeguidos(usuario.getId()));
    }


}
