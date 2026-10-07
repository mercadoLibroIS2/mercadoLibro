package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IntercambioRepository extends JpaRepository<Intercambio, IntercambioId> {
    List<Intercambio> findById_PropietarioIdOfrecida(String email);

    @Query("""
        SELECT COUNT(i) > 0 FROM Intercambio i
        WHERE i.estado IN :estados
        AND (
            (i.id.isbnOfrecida = :isbn
                AND i.id.propietarioIdOfrecida = :email
                AND i.id.horaDePublicacionOfrecida = :hora)
            OR
            (i.id.isbnSolicitante = :isbn
                AND i.id.propietarioIdSolicitante = :email
                AND i.id.horaDePublicacionSolicitante = :hora)
        )
    """)
    boolean existeIntercambioActivo(@Param("isbn") String isbn,
                                    @Param("email") String email,
                                    @Param("hora") LocalDateTime hora,
                                    @Param("estados") List<EstadoIntercambio> estados);

    @Query("""
    SELECT i FROM Intercambio i
    WHERE i.estado = :estado
    AND (
        (i.id.isbnOfrecida = :isbn
            AND i.id.propietarioIdOfrecida = :email
            AND i.id.horaDePublicacionOfrecida = :hora)
        OR
        (i.id.isbnSolicitante = :isbn
            AND i.id.propietarioIdSolicitante = :email
            AND i.id.horaDePublicacionSolicitante = :hora)
    )
""")
    List<Intercambio> buscarPorPublicacionYEstado(@Param("isbn") String isbn,
                                                  @Param("email") String email,
                                                  @Param("hora") LocalDateTime hora,
                                                  @Param("estado") EstadoIntercambio estado);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Intercambio i WHERE i.id = :id")
    Optional<Intercambio> findByIdParaActualizar(@Param("id") IntercambioId id);

    List<Intercambio> findById_PropietarioIdSolicitante(String email);
}
