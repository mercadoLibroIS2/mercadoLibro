package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Reporte;
import com.ingenieriaSoftware2.Enums.EstadoReporte;
import com.ingenieriaSoftware2.Enums.TipoReporte;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ReporteRepository extends JpaRepository<Reporte, UUID> {

    List<Reporte> findByEmailDenuncianteOrderByFechaDesc(String emailDenunciante);

    List<Reporte> findAllByOrderByFechaDesc();

    List<Reporte> findByEmailDenuncianteAndTipoAndEstadoIn(String emailDenunciante, TipoReporte tipo,
                                                           Collection<EstadoReporte> estados);

    long countByEstadoIn(Collection<EstadoReporte> estados);
}
