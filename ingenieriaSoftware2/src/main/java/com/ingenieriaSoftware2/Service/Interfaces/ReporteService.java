package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Request.ReporteRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.ResolverReporteRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.EstadisticasAdminResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.ReporteResponseDTO;
import com.ingenieriaSoftware2.Entity.Usuario;

import java.util.List;
import java.util.UUID;

public interface ReporteService {

    ReporteResponseDTO crear(ReporteRequestDTO request, Usuario denunciante);

    List<ReporteResponseDTO> listarPropios(Usuario usuario);

    // ---- Administración ----

    List<ReporteResponseDTO> listarTodos(Usuario admin);

    ReporteResponseDTO resolver(UUID reporteId, ResolverReporteRequestDTO request, Usuario admin);

    void reactivarUsuario(String email, Usuario admin);

    EstadisticasAdminResponseDTO estadisticas(Usuario admin);
}
