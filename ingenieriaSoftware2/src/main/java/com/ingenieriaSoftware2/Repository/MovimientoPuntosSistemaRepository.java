package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Ids.MovimientoPuntosSistemaId;
import com.ingenieriaSoftware2.Entity.MovimientoPuntosSistema;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MovimientoPuntosSistemaRepository
        extends JpaRepository<MovimientoPuntosSistema, MovimientoPuntosSistemaId> {

    List<MovimientoPuntosSistema>
    findByMovimientoPuntosSistemaId_UsuarioId(String usuarioId);
}