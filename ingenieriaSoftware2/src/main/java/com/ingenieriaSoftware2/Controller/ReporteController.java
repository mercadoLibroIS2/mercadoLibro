package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.ReporteRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.ReporteResponseDTO;
import com.ingenieriaSoftware2.Security.SecurityUtils;
import com.ingenieriaSoftware2.Service.Interfaces.ReporteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reportes")
@RequiredArgsConstructor
public class ReporteController {

    private final ReporteService reporteService;
    private final SecurityUtils securityUtils;

    @PostMapping
    public ResponseEntity<ReporteResponseDTO> crear(@Valid @RequestBody ReporteRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reporteService.crear(request, securityUtils.getUsuarioLogueado()));
    }

    @GetMapping("/mis-reportes")
    public ResponseEntity<List<ReporteResponseDTO>> listarPropios() {
        return ResponseEntity.ok(reporteService.listarPropios(securityUtils.getUsuarioLogueado()));
    }
}
