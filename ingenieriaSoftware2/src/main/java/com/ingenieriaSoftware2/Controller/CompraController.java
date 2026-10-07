package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.CancelacionRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.CompraIdParams;
import com.ingenieriaSoftware2.DTO.Request.CompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.EnvioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CompraResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Service.Interfaces.CompraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/compras")
@RequiredArgsConstructor
public class CompraController {

    private final CompraService compraService;

    @PostMapping
    public ResponseEntity<CompraResponseDTO> realizarCompra(@AuthenticationPrincipal Usuario usuario,
                                                            @Valid @RequestBody CompraRequestDTO request) {
        CompraResponseDTO response = compraService.realizarCompra(request, usuario.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/detalle")
    public ResponseEntity<CompraResponseDTO> obtenerPorId(@Valid @ModelAttribute CompraIdParams id) {
        return ResponseEntity.ok(compraService.obtenerPorId(id.toId()));
    }

    @GetMapping("/mis-compras")
    public ResponseEntity<List<CompraResponseDTO>> listarMisCompras(@AuthenticationPrincipal Usuario usuario) {
        return ResponseEntity.ok(compraService.listarPorComprador(usuario.getId()));
    }

    @GetMapping("/mis-ventas")
    public ResponseEntity<List<CompraResponseDTO>> listarMisVentas(@AuthenticationPrincipal Usuario usuario) {
        return ResponseEntity.ok(compraService.listarPorVendedor(usuario.getId()));
    }

    @PatchMapping("/confirmar-pago")
    public ResponseEntity<CompraResponseDTO> confirmarPago(@AuthenticationPrincipal Usuario usuario,
                                                           @Valid @ModelAttribute CompraIdParams id) {
        return ResponseEntity.ok(compraService.confirmarPago(id.toId(), usuario.getId()));
    }

    @PatchMapping("/enviar")
    public ResponseEntity<CompraResponseDTO> marcarComoEnviada(@AuthenticationPrincipal Usuario usuario,
                                                               @Valid @ModelAttribute CompraIdParams id,
                                                               @Valid @RequestBody EnvioRequestDTO body) {
        return ResponseEntity.ok(compraService.marcarComoEnviada(id.toId(), usuario.getId(), body.infoEnvio()));
    }

    @PatchMapping("/entregar")
    public ResponseEntity<CompraResponseDTO> marcarComoEntregada(@AuthenticationPrincipal Usuario usuario,
                                                                 @Valid @ModelAttribute CompraIdParams id) {
        return ResponseEntity.ok(compraService.marcarComoEntregada(id.toId(), usuario.getId()));
    }

    @PatchMapping("/cancelar")
    public ResponseEntity<CompraResponseDTO> cancelarCompra(@AuthenticationPrincipal Usuario usuario,
                                                            @Valid @ModelAttribute CompraIdParams id,
                                                            @RequestBody(required = false) CancelacionRequestDTO body) {
        String motivo = body != null ? body.motivo() : null;
        return ResponseEntity.ok(compraService.cancelarCompra(id.toId(), usuario.getId(), motivo));
    }
}