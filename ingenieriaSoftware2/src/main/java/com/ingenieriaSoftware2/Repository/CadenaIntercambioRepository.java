package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.CadenaIntercambio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CadenaIntercambioRepository extends JpaRepository<CadenaIntercambio, UUID> {
}
