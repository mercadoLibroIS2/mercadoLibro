package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.CompraActionRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.CompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CompraResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.CompraService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/compra")
@CrossOrigin(origins = "http://localhost:5173")
public class CompraController {
    @Autowired
    private CompraService compraService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CompraResponseDTO> pedirCompra(@Valid @RequestBody CompraRequestDTO request) {
        return ResponseEntity.ok(compraService.pedirCompra(usuarioActual().getId(), request));
    }

    @PatchMapping("/aceptar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CompraResponseDTO> aceptar(@Valid @RequestBody CompraActionRequestDTO request) {
        return ResponseEntity.ok(compraService.aceptar(usuarioActual().getId(), request.id()));
    }

    @PatchMapping("/rechazar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CompraResponseDTO> rechazar(@Valid @RequestBody CompraActionRequestDTO request) {
        return ResponseEntity.ok(compraService.rechazar(usuarioActual().getId(), request.id()));
    }

    @PatchMapping("/confirmar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CompraResponseDTO> confirmar(@Valid @RequestBody CompraActionRequestDTO request) {
        return ResponseEntity.ok(compraService.confirmar(usuarioActual().getId(), request.id()));
    }

    @GetMapping("/enviadas")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CompraResponseDTO>> enviadas() {
        return ResponseEntity.ok(compraService.enviadas(usuarioActual().getId()));
    }

    @GetMapping("/recibidas")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CompraResponseDTO>> recibidas() {
        return ResponseEntity.ok(compraService.recibidas(usuarioActual().getId()));
    }

    @GetMapping("/confirmadas")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CompraResponseDTO>> confirmadas() {
        return ResponseEntity.ok(compraService.confirmadas(usuarioActual().getId()));
    }

    private Usuario usuarioActual() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return usuarioRepository.findByNombre(authentication.getName())
                .orElseThrow(UsuarioNoEncontrado::new);
    }
}