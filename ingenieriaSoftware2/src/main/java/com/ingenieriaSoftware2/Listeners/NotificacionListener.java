package com.ingenieriaSoftware2.Listeners;

import com.ingenieriaSoftware2.Enums.TipoNotificacion;
import com.ingenieriaSoftware2.Eventos.ReseniaCreadaEvent;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class NotificacionListener {
    @Autowired
    private NotificacionService notificacionService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional
    public void onReseniaCreada(ReseniaCreadaEvent event) {
        notificacionService.crear(
                event.emailEvaluado(),
                TipoNotificacion.RESENIA_RECIBIDA,
                "Recibiste una nueva reseña de " + event.calificacion() + " estrellas");
    }
}
