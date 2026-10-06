package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Compra;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Enums.EstadoCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface CompraRepository extends JpaRepository<Compra, CompraId> {
    List<Compra> findById_CompradorEmail(String email);

    List<Compra> findById_PropietarioEmail(String email);

    @Query("""
    SELECT c FROM Compra c
    WHERE c.estado = :estado
    AND c.id.isbn = :isbn
    AND c.id.propietarioEmail = :email
    AND c.id.horaPublicacion = :hora
""")
    List<Compra> buscarPorPublicacionYEstado(@Param("isbn") String isbn,
                                             @Param("email") String email,
                                             @Param("hora") LocalDateTime hora,
                                             @Param("estado") EstadoCompra estado);
}
