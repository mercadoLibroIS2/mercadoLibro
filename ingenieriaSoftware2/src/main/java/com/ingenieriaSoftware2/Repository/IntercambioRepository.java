package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Intercambio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface IntercambioRepository extends JpaRepository<Intercambio, IntercambioId> {

}
