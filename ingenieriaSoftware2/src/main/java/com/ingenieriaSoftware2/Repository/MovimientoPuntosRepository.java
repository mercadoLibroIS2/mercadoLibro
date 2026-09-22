package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.MovimientoPuntos;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MovimientoPuntosRepository extends JpaRepository<MovimientoPuntos, UUID> {
}
