package com.ingenieriaSoftware2.Controller;

import com.ingenieriaSoftware2.DTO.Response.NotificacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notificacion")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;

    @GetMapping
    public ResponseEntity<Page<NotificacionResponseDTO>> listar(@AuthenticationPrincipal Usuario usuario,
                                                                @RequestParam(defaultValue = "false") boolean soloNoLeidas,
                                                                @RequestParam(defaultValue = "0") int pagina,
                                                                @RequestParam(defaultValue = "20") int tamanio) {
        PageRequest pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamanio, 1), 100));
        return ResponseEntity.ok(notificacionService.listar(usuario.getId(), soloNoLeidas, pageable));
    }

    @GetMapping("/no-leidas/cantidad")
    public ResponseEntity<Map<String, Long>> contarNoLeidas(@AuthenticationPrincipal Usuario usuario) {
        return ResponseEntity.ok(Map.of("cantidad", notificacionService.contarNoLeidas(usuario.getId())));
    }

    @PatchMapping("/{id}/leida")
    public ResponseEntity<Void> marcarLeida(@AuthenticationPrincipal Usuario usuario, @PathVariable UUID id) {
        notificacionService.marcarLeida(id, usuario.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/leidas")
    public ResponseEntity<Void> marcarTodasLeidas(@AuthenticationPrincipal Usuario usuario) {
        notificacionService.marcarTodasLeidas(usuario.getId());
        return ResponseEntity.noContent().build();
    }
}
