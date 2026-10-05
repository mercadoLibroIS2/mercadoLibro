package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Intercambio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface IntercambioRepository extends JpaRepository<Intercambio, IntercambioId> {
    List<Intercambio> findById_PropietarioIdOfrecida(String email);
}
