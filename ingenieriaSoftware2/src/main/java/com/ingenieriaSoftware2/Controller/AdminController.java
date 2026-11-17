package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.ResolverReporteRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.EstadisticasAdminResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.ReporteResponseDTO;
import com.ingenieriaSoftware2.Security.SecurityUtils;
import com.ingenieriaSoftware2.Service.Interfaces.ReporteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Panel de administración. SecurityConfig exige ROLE_ADMINISTRADOR para /api/admin/**. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final ReporteService reporteService;
    private final SecurityUtils securityUtils;

    @GetMapping("/reportes")
    public ResponseEntity<List<ReporteResponseDTO>> listarReportes() {
        return ResponseEntity.ok(reporteService.listarTodos(securityUtils.getUsuarioLogueado()));
    }

    @PatchMapping("/reportes/{id}")
    public ResponseEntity<ReporteResponseDTO> resolverReporte(@PathVariable UUID id,
                                                              @Valid @RequestBody ResolverReporteRequestDTO request) {
        return ResponseEntity.ok(reporteService.resolver(id, request, securityUtils.getUsuarioLogueado()));
    }

    @PatchMapping("/usuarios/{email}/reactivar")
    public ResponseEntity<Void> reactivarUsuario(@PathVariable String email) {
        reporteService.reactivarUsuario(email, securityUtils.getUsuarioLogueado());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/estadisticas")
    public ResponseEntity<EstadisticasAdminResponseDTO> estadisticas() {
        return ResponseEntity.ok(reporteService.estadisticas(securityUtils.getUsuarioLogueado()));
    }
}
