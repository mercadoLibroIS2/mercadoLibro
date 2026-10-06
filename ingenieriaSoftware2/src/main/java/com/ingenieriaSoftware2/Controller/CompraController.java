package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.CancelacionRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.CompraIdParams;
import com.ingenieriaSoftware2.DTO.Request.CompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.EnvioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CompraResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Service.Interfaces.CompraService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/compra")
@CrossOrigin(origins = "http://localhost:5173")
public class CompraController {
    @Autowired
    private CompraService compraService;

    @PostMapping
    public ResponseEntity<CompraResponseDTO> realizarCompra(@RequestParam UUID compradorId,
                                                            @Valid @RequestBody CompraRequestDTO request) {
        CompraResponseDTO response = compraService.realizarCompra(request, compradorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/detalle")
    public ResponseEntity<CompraResponseDTO> obtenerPorId(@Valid @ModelAttribute CompraIdParams id) {
        return ResponseEntity.ok(compraService.obtenerPorId(id.toId()));
    }

    @GetMapping("/comprador/{compradorId}")
    public ResponseEntity<List<CompraResponseDTO>> listarPorComprador(@PathVariable UUID compradorId) {
        return ResponseEntity.ok(compraService.listarPorComprador(compradorId));
    }

    @GetMapping("/vendedor/{vendedorId}")
    public ResponseEntity<List<CompraResponseDTO>> listarPorVendedor(@PathVariable UUID vendedorId) {
        return ResponseEntity.ok(compraService.listarPorVendedor(vendedorId));
    }

    @PatchMapping("/confirmar-pago")
    public ResponseEntity<CompraResponseDTO> confirmarPago(@AuthenticationPrincipal Usuario usuario,
                                                           @Valid @ModelAttribute CompraIdParams id) {
        return ResponseEntity.ok(compraService.confirmarPago(id.toId(), usuario.getId()));
    }

    @PatchMapping("/enviar")
    public ResponseEntity<CompraResponseDTO> marcarComoEnviada(@Valid @ModelAttribute CompraIdParams id,
                                                               @Valid @RequestBody EnvioRequestDTO body) {
        return ResponseEntity.ok(compraService.marcarComoEnviada(id.toId(), body.infoEnvio()));
    }

    @PatchMapping("/entregar")
    public ResponseEntity<CompraResponseDTO> marcarComoEntregada(@Valid @ModelAttribute CompraIdParams id) {
        return ResponseEntity.ok(compraService.marcarComoEntregada(id.toId()));
    }

    @PatchMapping("/cancelar")
    public ResponseEntity<CompraResponseDTO> cancelarCompra(@Valid @ModelAttribute CompraIdParams id,
                                                            @RequestBody(required = false) CancelacionRequestDTO cancelacionRequestDTO) {
        String motivo = cancelacionRequestDTO != null ? cancelacionRequestDTO.motivo() : null;
        return ResponseEntity.ok(compraService.cancelarCompra(id.toId(), motivo));
    }
}
