package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.LibroRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.LibroResponseDTO;
import com.ingenieriaSoftware2.Security.SecurityUtils;
import com.ingenieriaSoftware2.Service.Interfaces.LibroService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/libro")
@CrossOrigin(origins = "http://localhost:5173")
public class LibroController {

    @Autowired
    private LibroService libroService;
    @Autowired
    private SecurityUtils securityUtils;

    @PostMapping("/publicar")
    public ResponseEntity<LibroResponseDTO> publicarLibro(@Valid @RequestBody LibroRequestDTO request) {
        UUID usuarioId = securityUtils.obtenerUsuarioAutenticado().getId();
        LibroResponseDTO response = libroService.publicarLibro(request, usuarioId);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
