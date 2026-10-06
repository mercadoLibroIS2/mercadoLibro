package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.PublicacionRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.PublicacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Service.Interfaces.PublicacionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/publicacion")
@CrossOrigin(origins = "http://localhost:5173")
public class PublicacionController {
    @Autowired
    private PublicacionService publicacionService;

    @PostMapping("/publicar")
    public ResponseEntity<PublicacionResponseDTO> publicarLibro(@Valid @RequestBody PublicacionRequestDTO request, Authentication authentication) {
        String email = authentication.getName();
        PublicacionResponseDTO response = publicacionService.publicarLibro(request, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{email}/{isbn}/{hora}")
    public ResponseEntity<PublicacionResponseDTO> verDetallesPublicacion(@PathVariable String email,
                                                                         @PathVariable String isbn,
                                                                         @PathVariable LocalDateTime hora) {
        PublicacionId id = new PublicacionId(isbn,email ,hora);
        return ResponseEntity.ok(publicacionService.verDetallesPublicacion(id));
    }

    @PutMapping("/{email}/{isbn}")
    public ResponseEntity<Void> editarPublicacion(@PathVariable String email,
                                                  @PathVariable String isbn,
                                                  @Valid @RequestBody PublicacionRequestDTO dto) {
        PublicacionId id = new PublicacionId(isbn,email,LocalDateTime.now());
        publicacionService.editarPublicacion(id, dto);
        return ResponseEntity.noContent().build();
    }
}
