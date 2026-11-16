package com.ingenieriaSoftware2.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Solo expone un ping de disponibilidad.
 * Se quitaron /db-tables, /debug-register y /reset-and-init-schema: eran públicos y permitían
 * ver el esquema, obtener stack traces y BORRAR todas las tablas de la base sin autenticarse.
 */
@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping("/ping")
    public Map<String, String> ping() {
        return Map.of("status", "ok", "message", "pong");
    }
}
