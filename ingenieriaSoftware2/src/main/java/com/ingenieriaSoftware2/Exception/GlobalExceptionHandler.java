package com.ingenieriaSoftware2.Exception;

import com.ingenieriaSoftware2.Exception.Compra.CompraOperacionException;
import com.ingenieriaSoftware2.Exception.Intercambio.IntercambioOperacionException;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioYaExiste;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    @ExceptionHandler(UsuarioYaExiste.class)
    public ResponseEntity<Map<String, Object>> handleUsuarioYaExiste(UsuarioYaExiste e) {
        return response(HttpStatus.CONFLICT, "UsuarioYaExiste", e.getMessage());
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials() {
        return response(HttpStatus.UNAUTHORIZED, "BadCredentials", "Credenciales incorrectas");
    }

    @ExceptionHandler(CompraOperacionException.class)
    public ResponseEntity<Map<String, Object>> handleCompraOperacion(CompraOperacionException e) {
        return response(HttpStatus.BAD_REQUEST, "CompraOperacionInvalida", e.getMessage());
    }

    @ExceptionHandler(IntercambioOperacionException.class)
    public ResponseEntity<Map<String, Object>> handleIntercambioOperacion(IntercambioOperacionException e) {
        return response(HttpStatus.BAD_REQUEST, "IntercambioOperacionInvalida", e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldError() == null
                ? "Datos inválidos"
                : e.getBindingResult().getFieldError().getDefaultMessage();
        return response(HttpStatus.BAD_REQUEST, "ValidationError", message);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAll(Exception e) {
        log.error("Excepción no controlada en controlador", e);
        return response(HttpStatus.INTERNAL_SERVER_ERROR, e.getClass().getSimpleName(), e.getMessage());
    }

    private ResponseEntity<Map<String, Object>> response(HttpStatus status, String error, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
