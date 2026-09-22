package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.ReseniaControllerDTO;
import com.ingenieriaSoftware2.DTO.Response.ReseniaResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.ReseniaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.nio.file.attribute.UserPrincipal;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/resenia")
@CrossOrigin(origins = "http://localhost:5173")
public class ReseniaController {

    @Autowired
    private ReseniaService reseniaService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @PostMapping("/auto")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReseniaResponseDTO> crearReseniaAuto(@Valid @RequestBody ReseniaControllerDTO createDTO) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String nombre = authentication.getName();

        Usuario autor = usuarioRepository.findByNombre(nombre).orElseThrow(() -> new UsuarioNoEncontrado());

        ReseniaResponseDTO response = reseniaService.crearResenia(
                autor.getId(),
                createDTO.calificado(),
                createDTO.intercambioId(),
                createDTO.calificacion(),
                createDTO.comentario(),
                LocalDate.now()
        );
        URI location = URI.create(String.format("/api/resenias/%s", response.id()));
        return ResponseEntity.created(location).body(response);
    }
}
