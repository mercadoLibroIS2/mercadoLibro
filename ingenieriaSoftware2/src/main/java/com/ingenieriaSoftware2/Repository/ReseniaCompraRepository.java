package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.ReseniaCompraId;
import com.ingenieriaSoftware2.Entity.ReseniaCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReseniaCompraRepository extends JpaRepository<ReseniaCompra, ReseniaCompraId> {

    /** Reseñas que recibió el usuario: como vendedor (las escribe el comprador) o como comprador. */
    @Query("""
            SELECT r FROM ReseniaCompra r
            WHERE (r.id.compradorReviewer = true AND r.id.compraId.propietarioEmail = :email)
               OR (r.id.compradorReviewer = false AND r.id.compraId.compradorEmail = :email)
            """)
    List<ReseniaCompra> listarRecibidasPorEmail(@Param("email") String email);
}
