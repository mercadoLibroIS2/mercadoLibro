package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.IntercambioIdParams;
import com.ingenieriaSoftware2.DTO.Request.IntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.RechazoRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.IntercambioResponseDTO;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Service.Interfaces.IntercambioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/intercambio")
@CrossOrigin(origins = "http://localhost:5173")
public class IntercambioController {
    @Autowired
    private IntercambioService intercambioService;

    @PostMapping
    public ResponseEntity<IntercambioResponseDTO> proponerIntercambio(@RequestParam UUID usuarioId,
                                                                      @Valid @RequestBody IntercambioRequestDTO request) {
        IntercambioResponseDTO response = intercambioService.proponerIntercambio(request, usuarioId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/detalle")
    public ResponseEntity<IntercambioResponseDTO> obtenerPorId(@Valid @ModelAttribute IntercambioIdParams id) {
        return ResponseEntity.ok(intercambioService.obtenerPorId(id.toId()));
    }

    @GetMapping("/enviados/{usuarioId}")
    public ResponseEntity<List<IntercambioResponseDTO>> listarPropuestasEnviadas(@PathVariable UUID usuarioId) {
        return ResponseEntity.ok(intercambioService.listarPropuestasEnviadas(usuarioId));
    }

    @PatchMapping("/aceptar")
    public ResponseEntity<IntercambioResponseDTO> aceptarIntercambio(@Valid @ModelAttribute IntercambioIdParams id,
                                                                     @RequestParam UUID usuarioId) {
        return ResponseEntity.ok(intercambioService.aceptarIntercambio(id.toId(), usuarioId));
    }

    @PatchMapping("/rechazar")
    public ResponseEntity<IntercambioResponseDTO> rechazarIntercambio(@Valid @ModelAttribute IntercambioIdParams id,
                                                                      @RequestParam UUID usuarioId,
                                                                      @RequestBody(required = false) RechazoRequestDTO rechazo) {
        String motivo = rechazo != null ? rechazo.motivo() : null;
        return ResponseEntity.ok(intercambioService.rechazarIntercambio(id.toId(), usuarioId, motivo));
    }

    @PatchMapping("/cancelar")
    public ResponseEntity<IntercambioResponseDTO> cancelarIntercambio(@Valid @ModelAttribute IntercambioIdParams id,
                                                                      @RequestParam UUID usuarioId) {
        return ResponseEntity.ok(intercambioService.cancelarIntercambio(id.toId(), usuarioId));
    }

    @PatchMapping("/completar")
    public ResponseEntity<IntercambioResponseDTO> completarIntercambio(@Valid @ModelAttribute IntercambioIdParams id) {
        return ResponseEntity.ok(intercambioService.completarIntercambio(id.toId()));
    }

    @GetMapping("/estado")
    public ResponseEntity<EstadoIntercambio> consultarEstado(@Valid @ModelAttribute IntercambioIdParams id) {
        return ResponseEntity.ok(intercambioService.consultarEstado(id.toId()));
    }
}
