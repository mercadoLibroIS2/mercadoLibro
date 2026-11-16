package com.ingenieriaSoftware2.Event;

import com.ingenieriaSoftware2.Enums.TipoNotificacion;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Avisa al usuario evaluado cuando recibe una reseña (el evento se publicaba pero nadie lo escuchaba). */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReseniaCreadaListener {

    private final NotificacionService notificacionService;

    // REQUIRES_NEW: después del commit la transacción original ya terminó y no guardaría nada.
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void alCrearResenia(ReseniaCreadaEvent evento) {
        try {
            notificacionService.crear(evento.emailEvaluado(), TipoNotificacion.RESENIA_RECIBIDA);
        } catch (RuntimeException e) {
            log.warn("No se pudo notificar la reseña a {}: {}", evento.emailEvaluado(), e.getMessage());
        }
    }
}
