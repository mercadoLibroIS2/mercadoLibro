package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.CadenaIntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Security.SecurityUtils;
import com.ingenieriaSoftware2.Service.Interfaces.CadenaIntercambioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cadenaIntercambio")
@RequiredArgsConstructor
public class CadenaIntercambioController {

    private final CadenaIntercambioService cadenaIntercambioService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<CadenaIntercambioResponseDTO>> listarCadenas() {
        return ResponseEntity.ok(cadenaIntercambioService.listarCadenas());
    }

    @PostMapping
    public ResponseEntity<CadenaIntercambioResponseDTO> crearCadena(@RequestBody CadenaIntercambioRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cadenaIntercambioService.crearCadena(dto));
    }

    @PatchMapping("/{id}/aceptar")
    public ResponseEntity<CadenaIntercambioResponseDTO> aceptarCadena(
            @PathVariable UUID id,
            @AuthenticationPrincipal Usuario usuario
    ) {
        UUID usuarioId = resolveUsuarioId(usuario);
        return ResponseEntity.ok(cadenaIntercambioService.aceptarCadena(id, usuarioId));
    }

    @PatchMapping("/{id}/rechazar")
    public ResponseEntity<CadenaIntercambioResponseDTO> rechazarCadena(
            @PathVariable UUID id,
            @AuthenticationPrincipal Usuario usuario
    ) {
        UUID usuarioId = resolveUsuarioId(usuario);
        return ResponseEntity.ok(cadenaIntercambioService.rechazarCadena(id, usuarioId));
    }

    private UUID resolveUsuarioId(Usuario usuario) {
        if (usuario != null && usuario.getId() != null) {
            return usuario.getId();
        }
        return securityUtils != null ? securityUtils.getUsuarioIdLogueado() : null;
    }
}


