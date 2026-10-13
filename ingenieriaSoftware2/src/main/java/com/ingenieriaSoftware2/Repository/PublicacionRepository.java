package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PublicacionRepository extends JpaRepository<Publicacion, PublicacionId> {
    @Query("""
        SELECT p FROM Publicacion p
        WHERE p.estadoPublicacion <> :eliminada
        ORDER BY p.id.horaPublicacion DESC
        """)
    List<Publicacion> listarNoEliminadas(@Param("eliminada") EstadoPublicacion eliminada);

    @Query("""
        SELECT p FROM Publicacion p
        WHERE p.id.emailPropietario = :email
        AND p.estadoPublicacion <> :eliminada
        ORDER BY p.id.horaPublicacion DESC
        """)
    List<Publicacion> listarPorPropietario(@Param("email") String email,
                                           @Param("eliminada") EstadoPublicacion eliminada);

    @Query("""
        SELECT p FROM Publicacion p
        WHERE p.estadoPublicacion = :estado
        ORDER BY p.id.horaPublicacion DESC
        """)
    List<Publicacion> listarPorEstado(@Param("estado") EstadoPublicacion estado);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Publicacion p WHERE p.id = :id")
    Optional<Publicacion> findByIdParaActualizar(@Param("id") PublicacionId id);
}
