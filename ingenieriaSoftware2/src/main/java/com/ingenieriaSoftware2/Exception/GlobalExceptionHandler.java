package com.ingenieriaSoftware2.Exception;

import com.ingenieriaSoftware2.Exception.Compra.CompraNoEncontradaException;
import com.ingenieriaSoftware2.Exception.Compra.EstadoCompraInvalidoException;
import com.ingenieriaSoftware2.Exception.Intercambio.EstadoIntercambioInvalidoException;
import com.ingenieriaSoftware2.Exception.Intercambio.IntercambioNoExiste;
import com.ingenieriaSoftware2.Exception.Intercambio.PuntosInsuficientesException;
import com.ingenieriaSoftware2.Exception.Libro.LibroNoExisteException;
import com.ingenieriaSoftware2.Exception.Usuario.ContraseniaIncorrecta;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoAutenticadoException;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioYaExiste;
import com.ingenieriaSoftware2.Exception.Intercambio.AccionNoPermitidaException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoDisponibleException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoExisteException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(UsuarioYaExiste.class)
    public ResponseEntity<Map<String, Object>> handleUsuarioYaExiste(UsuarioYaExiste e) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.CONFLICT.value());
        body.put("error", "UsuarioYaExiste");
        body.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.UNAUTHORIZED.value());
        body.put("error", "BadCredentials");
        body.put("message", "Credenciales incorrectas");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.BAD_REQUEST.value());
        String msg = e.getBindingResult().getFieldError() != null 
                ? e.getBindingResult().getFieldError().getDefaultMessage() 
                : "Datos inválidos";
        body.put("error", "ValidationError");
        body.put("message", msg);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", e.getStatusCode().value());
        body.put("error", e.getClass().getSimpleName());
        body.put("message", e.getReason() != null ? e.getReason() : e.getMessage());
        return ResponseEntity.status(e.getStatusCode()).body(body);
    }

    @ExceptionHandler(AccionNoPermitidaException.class)
    public ResponseEntity<Map<String, Object>> handleAccionNoPermitida(AccionNoPermitidaException e) {
        return handlePublicacionError(HttpStatus.FORBIDDEN, "AccionNoPermitida", e.getMessage());
    }

    @ExceptionHandler(PublicacionNoDisponibleException.class)
    public ResponseEntity<Map<String, Object>> handlePublicacionNoDisponible(PublicacionNoDisponibleException e) {
        return handlePublicacionError(HttpStatus.CONFLICT, "PublicacionNoDisponible", e.getMessage());
    }

    @ExceptionHandler(PublicacionNoExisteException.class)
    public ResponseEntity<Map<String, Object>> handlePublicacionNoExiste(PublicacionNoExisteException e) {
        return handlePublicacionError(HttpStatus.NOT_FOUND, "PublicacionNoExiste", e.getMessage());
    }

    private ResponseEntity<Map<String, Object>> handlePublicacionError(HttpStatus status, String error, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }

    // Errores de negocio: antes caían en handleAll y respondían 500.
    @ExceptionHandler({
            IntercambioNoExiste.class,
            CompraNoEncontradaException.class,
            LibroNoExisteException.class,
            UsuarioNoEncontrado.class
    })
    public ResponseEntity<Map<String, Object>> handleNoEncontrado(RuntimeException e) {
        return handlePublicacionError(HttpStatus.NOT_FOUND, e.getClass().getSimpleName(), mensaje(e, "Recurso no encontrado"));
    }

    @ExceptionHandler({
            EstadoIntercambioInvalidoException.class,
            EstadoCompraInvalidoException.class,
            PuntosInsuficientesException.class
    })
    public ResponseEntity<Map<String, Object>> handleConflicto(RuntimeException e) {
        return handlePublicacionError(HttpStatus.CONFLICT, e.getClass().getSimpleName(), mensaje(e, "La operación no es válida en el estado actual"));
    }

    @ExceptionHandler({AtributoFueraDeRangoException.class, ContraseniaIncorrecta.class})
    public ResponseEntity<Map<String, Object>> handleDatosInvalidos(RuntimeException e) {
        return handlePublicacionError(HttpStatus.BAD_REQUEST, e.getClass().getSimpleName(), mensaje(e, "Datos inválidos"));
    }

    @ExceptionHandler(UsuarioNoAutenticadoException.class)
    public ResponseEntity<Map<String, Object>> handleNoAutenticado(UsuarioNoAutenticadoException e) {
        return handlePublicacionError(HttpStatus.UNAUTHORIZED, "UsuarioNoAutenticado", mensaje(e, "No hay un usuario logueado"));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleRutaInexistente(NoResourceFoundException e) {
        return handlePublicacionError(HttpStatus.NOT_FOUND, "NoEncontrado", "La ruta solicitada no existe");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMetodoNoPermitido(HttpRequestMethodNotSupportedException e) {
        return handlePublicacionError(HttpStatus.METHOD_NOT_ALLOWED, "MetodoNoPermitido", e.getMessage());
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Map<String, Object>> handleCuerpoInvalido(Exception e) {
        return handlePublicacionError(HttpStatus.BAD_REQUEST, "SolicitudInvalida", "El cuerpo o los parámetros de la solicitud no son válidos");
    }

    private static String mensaje(RuntimeException e, String porDefecto) {
        return e.getMessage() != null ? e.getMessage() : porDefecto;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAll(Exception e) {
        log.error("Excepción no controlada en controlador: ", e);
        // No se devuelven mensajes internos ni causas (podían exponer SQL o detalles de la base).
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("error", "ErrorInterno");
        body.put("message", "Ocurrió un error inesperado. Intentá de nuevo más tarde.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
