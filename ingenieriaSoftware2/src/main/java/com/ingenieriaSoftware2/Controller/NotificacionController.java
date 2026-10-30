package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Response.NotificacionResponseDTO;
import com.ingenieriaSoftware2.Security.SecurityUtils;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/notificacion")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<Page<NotificacionResponseDTO>> listar(
            @RequestParam(defaultValue = "false") boolean soloNoLeidas,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID usuarioId = securityUtils.getUsuarioIdLogueado();
        return ResponseEntity.ok(notificacionService.listar(usuarioId, soloNoLeidas, pageable));
    }

    @GetMapping("/no-leidas/count")
    public ResponseEntity<Long> contarNoLeidas() {
        UUID usuarioId = securityUtils.getUsuarioIdLogueado();
        return ResponseEntity.ok(notificacionService.contarNoLeidas(usuarioId));
    }

    @PatchMapping("/{id}/leida")
    public ResponseEntity<Void> marcarLeida(@PathVariable UUID id) {
        UUID usuarioId = securityUtils.getUsuarioIdLogueado();
        notificacionService.marcarLeida(id, usuarioId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/marcar-todas")
    public ResponseEntity<Void> marcarTodasLeidas() {
        UUID usuarioId = securityUtils.getUsuarioIdLogueado();
        notificacionService.marcarTodasLeidas(usuarioId);
        return ResponseEntity.noContent().build();
    }
}

