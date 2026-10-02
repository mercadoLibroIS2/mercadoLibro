package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Response.MovimientoPuntosResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.SaldoPuntosResponseDTO;
import com.ingenieriaSoftware2.Service.Interfaces.MovimientoPuntosService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/movimientoPuntos")
@CrossOrigin(origins = "http://localhost:5173")
public class MovimientoPuntosController {

    @Autowired
    private MovimientoPuntosService movimientoPuntosService;

    @GetMapping("/saldo")
    public ResponseEntity<SaldoPuntosResponseDTO> obtenerSaldo() {

        return ResponseEntity.ok(
                movimientoPuntosService.obtenerSaldoActual()
        );
    }

    @GetMapping("/historial")
    public ResponseEntity<List<MovimientoPuntosResponseDTO>> obtenerHistorial() {

        return ResponseEntity.ok(
                movimientoPuntosService.obtenerHistorial()
        );
    }
}