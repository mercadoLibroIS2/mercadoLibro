package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.EventoSistema;
import com.ingenieriaSoftware2.Entity.Ids.EventoSistemaId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventoSistemaRepository
        extends JpaRepository<EventoSistema, EventoSistemaId> {
}