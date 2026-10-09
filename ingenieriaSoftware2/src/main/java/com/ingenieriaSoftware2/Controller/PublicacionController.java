package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.PublicacionIdParams;
import com.ingenieriaSoftware2.DTO.Request.PublicacionRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.PublicacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Service.Interfaces.PublicacionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/publicaciones")
@RequiredArgsConstructor
public class PublicacionController {

    private final PublicacionService publicacionService;

    @PostMapping("/publicar")
    public ResponseEntity<PublicacionResponseDTO> publicarLibro(@AuthenticationPrincipal Usuario usuario,
                                                                @Valid @RequestBody PublicacionRequestDTO request) {
        PublicacionResponseDTO response = publicacionService.publicarLibro(request, usuario.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<PublicacionResponseDTO>> listarPublicaciones() {
        return ResponseEntity.ok(publicacionService.listarPublicaciones());
    }

    @GetMapping("/disponibles")
    public ResponseEntity<List<PublicacionResponseDTO>> listarPublicacionesDisponibles() {
        return ResponseEntity.ok(publicacionService.listarPublicacionesDisponibles());
    }

    @GetMapping("/mis-publicaciones")
    public ResponseEntity<List<PublicacionResponseDTO>> listarMisPublicaciones(
            @AuthenticationPrincipal Usuario usuario) {
        return ResponseEntity.ok(publicacionService.listarMisPublicaciones(usuario.getEmail()));
    }

    @GetMapping("/detalle")
    public ResponseEntity<PublicacionResponseDTO> verDetallesPublicacion(@Valid @ModelAttribute PublicacionIdParams id) {
        return ResponseEntity.ok(publicacionService.verDetallesPublicacion(id.toId()));
    }

    @PutMapping("/editar")
    public ResponseEntity<Void> editarPublicacion(@AuthenticationPrincipal Usuario usuario,
                                                  @Valid @ModelAttribute PublicacionIdParams id,
                                                  @Valid @RequestBody PublicacionRequestDTO dto) {
        publicacionService.editarPublicacion(id.toId(), dto, usuario.getEmail());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/eliminar")
    public ResponseEntity<Void> eliminarPublicacion(@AuthenticationPrincipal Usuario usuario,
                                                    @Valid @ModelAttribute PublicacionIdParams id) {
        publicacionService.eliminarPublicacion(id.toId(), usuario.getEmail());
        return ResponseEntity.noContent().build();
    }
}