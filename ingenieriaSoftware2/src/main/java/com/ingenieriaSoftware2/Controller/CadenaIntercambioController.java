package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.CadenaIntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;
import com.ingenieriaSoftware2.Security.SecurityUtils;
import com.ingenieriaSoftware2.Service.Interfaces.CadenaIntercambioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cadenaIntercambio")
@CrossOrigin(origins = "http://localhost:5173")
public class CadenaIntercambioController {

    @Autowired
    private CadenaIntercambioService cadenaIntercambioService;

    @Autowired
    private SecurityUtils securityUtils;

    @GetMapping("/mis-cadenas")
    public ResponseEntity<List<CadenaIntercambioResponseDTO>> obtenerMisCadenas() {
        UUID usuarioId = securityUtils.obtenerUsuarioAutenticado().getId();
        return ResponseEntity.ok(cadenaIntercambioService.obtenerCadenasDeUsuario(usuarioId));
    }

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<List<CadenaIntercambioResponseDTO>> obtenerCadenasPorUsuario(@PathVariable UUID usuarioId) {
        return ResponseEntity.ok(cadenaIntercambioService.obtenerCadenasDeUsuario(usuarioId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CadenaIntercambioResponseDTO> obtenerCadenaPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(cadenaIntercambioService.obtenerCadenaPorId(id));
    }

    @PostMapping("/{id}/confirmar")
    public ResponseEntity<CadenaIntercambioResponseDTO> confirmarPaso(@PathVariable UUID id) {
        UUID usuarioId = securityUtils.obtenerUsuarioAutenticado().getId();
        return ResponseEntity.ok(cadenaIntercambioService.confirmarPaso(id, usuarioId));
    }

    @PostMapping("/{id}/rechazar")
    public ResponseEntity<CadenaIntercambioResponseDTO> rechazarCadena(@PathVariable UUID id) {
        UUID usuarioId = securityUtils.obtenerUsuarioAutenticado().getId();
        return ResponseEntity.ok(cadenaIntercambioService.rechazarCadena(id, usuarioId));
    }

    @PostMapping
    public ResponseEntity<CadenaIntercambioResponseDTO> crearCadena(@Valid @RequestBody CadenaIntercambioRequestDTO request) {
        CadenaIntercambioResponseDTO response = cadenaIntercambioService.crearCadena(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
