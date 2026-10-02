package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Response.NotificacionResponseDTO;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionController {

    @Autowired
    private NotificacionService notificacionService;

    @GetMapping
    public Page<NotificacionResponseDTO> listar(
            @RequestParam(defaultValue = "false") boolean soloNoLeidas,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserDetails userDetails) {
        return notificacionService.listar(UUID.fromString(userDetails.getUsername()), soloNoLeidas, pageable);
    }

    @GetMapping("/no-leidas/cantidad")
    public Map<String, Long> contarNoLeidas(@AuthenticationPrincipal UserDetails userDetails) {
        return Map.of("cantidad", notificacionService.contarNoLeidas(UUID.fromString(userDetails.getUsername())));
    }

    @PatchMapping("/{id}/leida")
    public ResponseEntity<Void> marcarLeida(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        notificacionService.marcarLeida(id, UUID.fromString(userDetails.getUsername()));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/leidas")
    public ResponseEntity<Void> marcarTodasLeidas(@AuthenticationPrincipal UserDetails userDetails) {
        notificacionService.marcarTodasLeidas(UUID.fromString(userDetails.getUsername()));
        return ResponseEntity.noContent().build();
    }
}