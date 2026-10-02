package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificacionRepository extends JpaRepository<Notificacion, UUID> {
}
