package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Request.UsuarioRequestDTO;
import com.ingenieriaSoftware2.Service.Interfaces.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AuthService authService;

    @GetMapping("/ping")
    public Map<String, String> ping() {
        return Map.of("status", "ok", "message", "pong");
    }

    @GetMapping("/db-tables")
    public List<Map<String, Object>> getTables() {
        return jdbcTemplate.queryForList(
                "SELECT table_name, column_name, data_type, is_nullable " +
                "FROM information_schema.columns " +
                "WHERE table_schema = 'public' " +
                "ORDER BY table_name, ordinal_position"
        );
    }

    @PostMapping("/debug-register")
    public Map<String, Object> debugRegister(@RequestBody UsuarioRequestDTO dto) {
        Map<String, Object> result = new HashMap<>();
        try {
            result.put("success", true);
            result.put("data", authService.registrar(dto));
        } catch (Throwable t) {
            StringWriter sw = new StringWriter();
            t.printStackTrace(new PrintWriter(sw));
            result.put("success", false);
            result.put("errorClass", t.getClass().getName());
            result.put("errorMessage", t.getMessage());
            result.put("stackTrace", sw.toString());
            if (t.getCause() != null) {
                result.put("causeClass", t.getCause().getClass().getName());
                result.put("causeMessage", t.getCause().getMessage());
            }
        }
        return result;
    }
}
