package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosReseniaId;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosResenia;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MovimientoPuntosReseniaRepository extends JpaRepository<MovimientoPuntosResenia, MovimientoPuntosReseniaId> {
}
