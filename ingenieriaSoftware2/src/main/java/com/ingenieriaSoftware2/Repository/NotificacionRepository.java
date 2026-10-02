package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Notificacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface NotificacionRepository extends JpaRepository<Notificacion, UUID> {
    Page<Notificacion> findByUsuarioEmailOrderByFechaCreacionDesc(String email, Pageable pageable);

    Page<Notificacion> findByUsuarioEmailAndLeidaFalseOrderByFechaCreacionDesc(String email, Pageable pageable);

    long countByUsuarioEmailAndLeidaFalse(String email);

    @Modifying
    @Query("UPDATE Notificacion n SET n.leida = true WHERE n.usuario.email = :email AND n.leida = false")
    int marcarTodasLeidas(@Param("email") String email);
}
