package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.ReseniaId;
import com.ingenieriaSoftware2.Entity.Resenia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReseniaRepository extends JpaRepository<Resenia, ReseniaId> {
    @Query("SELECT COALESCE(AVG(r.calificacion), 0) FROM Resenia r " +
            "WHERE (r.id.solicitanteReviewer = true AND r.intercambio.id.propietarioIdOfrecida = :email) " +
            "OR (r.id.solicitanteReviewer = false AND r.intercambio.id.propietarioIdSolicitante = :email)")
    float calcularPromedioRecibido(@Param("email") String email);
}
