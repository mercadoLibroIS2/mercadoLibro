package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.ReseniaRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.ReseniaResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Security.SecurityUtils;
import com.ingenieriaSoftware2.Service.Interfaces.ReseniaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/resenia")
@CrossOrigin(origins = "http://localhost:5173")
public class ReseniaController {

    @Autowired
    private ReseniaService reseniaService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private SecurityUtils securityUtils;

    @PostMapping
    public ResponseEntity<ReseniaResponseDTO> crearResenia(
            @RequestBody ReseniaRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        ReseniaResponseDTO response = reseniaService.crearResenia(dto, UUID.fromString(userDetails.getUsername()));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
