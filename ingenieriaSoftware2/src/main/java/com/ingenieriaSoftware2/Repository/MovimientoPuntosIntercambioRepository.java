package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.MovimientoPuntosIntercambio;
import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosIntercambioId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MovimientoPuntosIntercambioRepository
        extends JpaRepository<MovimientoPuntosIntercambio, MovimientoPuntosIntercambioId> {

    List<MovimientoPuntosIntercambio>
    findByMovimientoPuntosIntercambioId_UsuarioId(UUID usuarioId);
}