package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosIntercambio;
import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosIntercambioId;
import com.ingenieriaSoftware2.Enums.TipoMovimiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MovimientoPuntosIntercambioRepository
        extends JpaRepository<MovimientoPuntosIntercambio, MovimientoPuntosIntercambioId> {

    List<MovimientoPuntosIntercambio>
    findByMovimientoPuntosIntercambioId_UsuarioId(UUID usuarioId);

    @Query("""
        SELECT COUNT(m) FROM MovimientoPuntosIntercambio m
        WHERE m.intercambio.id = :intercambioId
        AND m.usuario.id = :usuarioId
        AND m.movimientoPuntosIntercambioId.tipoMovimiento = :tipo
    """)
    long contarMovimientos(@Param("intercambioId") IntercambioId intercambioId,
                           @Param("usuarioId") UUID usuarioId,
                           @Param("tipo") TipoMovimiento tipo);
}