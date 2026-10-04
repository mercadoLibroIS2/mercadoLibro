package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosReseniaId;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosResenia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MovimientoPuntosReseniaRepository
        extends JpaRepository<MovimientoPuntosResenia, MovimientoPuntosReseniaId> {

    List<MovimientoPuntosResenia> findByMovimientoPuntosReseniaId_UsuarioId(String usuarioId);
}