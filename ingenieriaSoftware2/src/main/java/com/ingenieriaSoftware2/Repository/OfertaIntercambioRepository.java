package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.OfertaIntercambio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OfertaIntercambioRepository extends JpaRepository<OfertaIntercambio, UUID> {
}
