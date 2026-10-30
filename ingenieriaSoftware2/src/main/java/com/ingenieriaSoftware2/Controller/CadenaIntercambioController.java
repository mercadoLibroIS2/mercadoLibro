package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.Entity.CadenaIntercambio;
import com.ingenieriaSoftware2.Repository.CadenaIntercambioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/cadenaIntercambio")
@RequiredArgsConstructor
public class CadenaIntercambioController {

    private final CadenaIntercambioRepository cadenaIntercambioRepository;

    @GetMapping
    public ResponseEntity<List<CadenaIntercambio>> listarCadenas() {
        return ResponseEntity.ok(cadenaIntercambioRepository.findAll());
    }
}

