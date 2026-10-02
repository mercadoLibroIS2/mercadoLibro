package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.MovimientoPuntosCompra;
import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosCompraId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MovimientoPuntosCompraRepository
        extends JpaRepository<MovimientoPuntosCompra, MovimientoPuntosCompraId> {

    List<MovimientoPuntosCompra>
    findByMovimientoPuntosCompraId_UsuarioId(UUID usuarioId);
}