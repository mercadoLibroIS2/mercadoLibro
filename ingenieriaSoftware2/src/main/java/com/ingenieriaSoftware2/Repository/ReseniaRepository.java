package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.ReseniaId;
import com.ingenieriaSoftware2.Entity.Resenia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReseniaRepository extends JpaRepository<Resenia, ReseniaId> {
    @Query("""
            SELECT AVG(r.calificacion)
            FROM Resenia r
            WHERE (r.id.solicitanteReviewer = true
                   AND r.id.intercambioId.propietarioIdOfrecida = :email)
               OR (r.id.solicitanteReviewer = false
                   AND r.id.intercambioId.propietarioIdSolicitante = :email)
            """)
    Double calcularPromedioRecibido(@Param("email") String email);
}
