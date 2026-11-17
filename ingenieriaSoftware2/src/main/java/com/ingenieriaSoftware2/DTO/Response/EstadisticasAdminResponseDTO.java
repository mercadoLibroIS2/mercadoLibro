package com.ingenieriaSoftware2.DTO.Response;

import java.util.List;
import java.util.Map;

public record EstadisticasAdminResponseDTO(
        long usuarios,
        long usuariosSuspendidos,
        long publicacionesDisponibles,
        long publicacionesReservadas,
        long publicacionesVendidas,
        Map<String, Long> intercambiosPorEstado,
        long puntosEnCirculacion,
        long puntosReservados,
        Double reputacionPromedio,
        long resenias,
        long reportesAbiertos,
        long reportesCerrados,
        List<UsuarioAdminDTO> usuariosSuspendidosDetalle
) {
    public record UsuarioAdminDTO(String email, String nombre, String rol, boolean activo) {
    }
}
