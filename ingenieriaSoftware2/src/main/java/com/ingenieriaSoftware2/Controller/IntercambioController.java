package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.IntercambioIdParams;
import com.ingenieriaSoftware2.DTO.Request.IntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.RechazoRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.IntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Service.Interfaces.IntercambioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/intercambios")
@RequiredArgsConstructor
public class IntercambioController {

    private final IntercambioService intercambioService;

    @PostMapping
    public ResponseEntity<IntercambioResponseDTO> proponerIntercambio(@AuthenticationPrincipal Usuario usuario,
                                                                      @Valid @RequestBody IntercambioRequestDTO request) {
        IntercambioResponseDTO response = intercambioService.proponerIntercambio(request, usuario.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/detalle")
    public ResponseEntity<IntercambioResponseDTO> obtenerPorId(@Valid @ModelAttribute IntercambioIdParams id) {
        return ResponseEntity.ok(intercambioService.obtenerPorId(id.toId()));
    }

    @GetMapping("/enviados")
    public ResponseEntity<List<IntercambioResponseDTO>> listarPropuestasEnviadas(@AuthenticationPrincipal Usuario usuario) {
        return ResponseEntity.ok(intercambioService.listarPropuestasEnviadas(usuario.getId()));
    }

    @PatchMapping("/aceptar")
    public ResponseEntity<IntercambioResponseDTO> aceptarIntercambio(@AuthenticationPrincipal Usuario usuario,
                                                                     @Valid @ModelAttribute IntercambioIdParams id) {
        return ResponseEntity.ok(intercambioService.aceptarIntercambio(id.toId(), usuario.getId()));
    }

    @PatchMapping("/rechazar")
    public ResponseEntity<IntercambioResponseDTO> rechazarIntercambio(@AuthenticationPrincipal Usuario usuario,
                                                                      @Valid @ModelAttribute IntercambioIdParams id,
                                                                      @RequestBody(required = false) RechazoRequestDTO body) {
        String motivo = body != null ? body.motivo() : null;
        return ResponseEntity.ok(intercambioService.rechazarIntercambio(id.toId(), usuario.getId(), motivo));
    }

    @PatchMapping("/cancelar")
    public ResponseEntity<IntercambioResponseDTO> cancelarIntercambio(@AuthenticationPrincipal Usuario usuario,
                                                                      @Valid @ModelAttribute IntercambioIdParams id) {
        return ResponseEntity.ok(intercambioService.cancelarIntercambio(id.toId(), usuario.getId()));
    }

    @PatchMapping("/completar")
    public ResponseEntity<IntercambioResponseDTO> completarIntercambio(@AuthenticationPrincipal Usuario usuario,
                                                                       @Valid @ModelAttribute IntercambioIdParams id) {
        return ResponseEntity.ok(intercambioService.completarIntercambio(id.toId(), usuario.getId()));
    }

    @GetMapping("/estado")
    public ResponseEntity<EstadoIntercambio> consultarEstado(@Valid @ModelAttribute IntercambioIdParams id) {
        return ResponseEntity.ok(intercambioService.consultarEstado(id.toId()));
    }
}