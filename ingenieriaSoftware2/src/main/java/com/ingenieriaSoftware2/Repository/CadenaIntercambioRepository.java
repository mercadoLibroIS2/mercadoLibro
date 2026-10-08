package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.CadenaIntercambio;
import com.ingenieriaSoftware2.Enums.EstadoCadena;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CadenaIntercambioRepository extends JpaRepository<CadenaIntercambio, UUID> {

    @Query("SELECT DISTINCT c FROM CadenaIntercambio c JOIN c.participantes p WHERE p.id = :usuarioId")
    List<CadenaIntercambio> findByParticipanteId(@Param("usuarioId") UUID usuarioId);

    List<CadenaIntercambio> findByEstado(EstadoCadena estado);
}
