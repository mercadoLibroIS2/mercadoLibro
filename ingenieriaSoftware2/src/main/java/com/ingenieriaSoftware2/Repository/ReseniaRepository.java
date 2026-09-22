package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Resenia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ReseniaRepository extends JpaRepository<Resenia, UUID> {
}
