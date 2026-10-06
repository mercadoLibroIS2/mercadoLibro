package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosCompra;
import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosCompraId;
import com.ingenieriaSoftware2.Enums.TipoMovimiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MovimientoPuntosCompraRepository
        extends JpaRepository<MovimientoPuntosCompra, MovimientoPuntosCompraId> {

    List<MovimientoPuntosCompra>
    findByMovimientoPuntosCompraId_UsuarioId(UUID usuarioId);

    @Query("""
        SELECT COUNT(m) FROM MovimientoPuntosCompra m
        WHERE m.compra.id = :compraId
        AND m.usuario.id = :usuarioId
        AND m.movimientoPuntosCompraId.tipoMovimiento = :tipo
    """)
    long contarMovimientos(@Param("compraId") CompraId compraId,
                           @Param("usuarioId") UUID usuarioId,
                           @Param("tipo") TipoMovimiento tipo);
}