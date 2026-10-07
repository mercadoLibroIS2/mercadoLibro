package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Publicacion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PublicacionRepository extends JpaRepository<Publicacion, PublicacionId> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Publicacion p WHERE p.id = :id")
    Optional<Publicacion> findByIdParaActualizar(@Param("id") PublicacionId id);
}
