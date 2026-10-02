package com.ingenieriaSoftware2.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Intercambio;

public interface IntercambioRepository extends JpaRepository<Intercambio, IntercambioId> {
}
