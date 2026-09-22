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

    @PostMapping("/reset-and-init-schema")
    public Map<String, Object> resetAndInitSchema() {
        Map<String, Object> res = new HashMap<>();
        try {
            // Drop old conflicting tables
            jdbcTemplate.execute("DROP TABLE IF EXISTS cadena_participantes CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS oferta_libros_deseados CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS notificacion CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS resenia CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS resena CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS movimiento_puntos CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS intercambio CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS oferta_intercambio CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS libro_categoria CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS libro CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS cadena_intercambio CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS usuario CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS publicacion_historial_precio CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS publicacion CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS reporte CASCADE");

            // Create schema cleanly
            org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource("schema.sql");
            String sql = new String(resource.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            for (String statement : sql.split(";")) {
                String trimmed = statement.trim();
                if (!trimmed.isEmpty() && !trimmed.startsWith("--")) {
                    jdbcTemplate.execute(trimmed);
                }
            }
            res.put("success", true);
            res.put("message", "Schema successfully recreated and aligned with Java entities");
        } catch (Exception e) {
            res.put("success", false);
            res.put("error", e.getMessage());
        }
        return res;
    }
}
