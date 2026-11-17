package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.ReporteRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.ResolverReporteRequestDTO;
import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Entity.Reporte;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.*;
import com.ingenieriaSoftware2.Repository.*;
import com.ingenieriaSoftware2.Service.Interfaces.IntercambioService;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReporteServiceImplTest {

    @Mock ReporteRepository reporteRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock PublicacionRepository publicacionRepository;
    @Mock IntercambioRepository intercambioRepository;
    @Mock ReseniaRepository reseniaRepository;
    @Mock IntercambioService intercambioService;
    @Mock NotificacionService notificacionService;

    @InjectMocks ReporteServiceImpl service;

    private static Usuario usuario(String email, Rol rol) {
        Usuario u = new Usuario();
        u.setId(UUID.randomUUID());
        u.setEmail(email);
        u.setNombre(email.split("@")[0]);
        u.setRol(rol);
        u.setEsActivo(true);
        return u;
    }

    @Test
    void referenciaDeIntercambioIdaYVuelta() {
        IntercambioId id = new IntercambioId("111", "a@x.com", LocalDateTime.of(2026, 11, 1, 10, 30, 5),
                "222", "b@x.com", LocalDateTime.of(2026, 11, 2, 9, 0, 1));
        String ref = ReporteServiceImpl.referencia(id);
        assertEquals("111|a@x.com|2026-11-01T10:30:05:222|b@x.com|2026-11-02T09:00:01", ref);
        assertEquals(id, ReporteServiceImpl.parsearReferencia(ref));
        assertNull(ReporteServiceImpl.parsearReferencia("basura"));
    }

    @Test
    void noSePuedeReportarASiMismo() {
        Usuario ana = usuario("ana@x.com", Rol.USUARIO);
        when(usuarioRepository.findByEmail("ana@x.com")).thenReturn(Optional.of(ana));
        var req = new ReporteRequestDTO(TipoReporte.USUARIO, MotivoReporte.FRAUDE, "Detalle suficiente", "ana@x.com", null, null, null);
        assertThrows(ResponseStatusException.class, () -> service.crear(req, ana));
        verify(reporteRepository, never()).save(any());
    }

    @Test
    void usuarioComunNoPuedeResolver() {
        Usuario ana = usuario("ana@x.com", Rol.USUARIO);
        var req = new ResolverReporteRequestDTO(EstadoReporte.RESUELTO, "ok", AccionAdmin.NINGUNA);
        assertThrows(ResponseStatusException.class, () -> service.resolver(UUID.randomUUID(), req, ana));
    }

    @Test
    void suspenderUsuarioDaDeBajaSusPublicacionesYNotifica() {
        Usuario admin = usuario("admin@x.com", Rol.ADMINISTRADOR);
        Usuario malo = usuario("malo@x.com", Rol.USUARIO);
        Reporte reporte = new Reporte();
        reporte.setId(UUID.randomUUID());
        reporte.setTipo(TipoReporte.USUARIO);
        reporte.setMotivo(MotivoReporte.FRAUDE);
        reporte.setEmailDenunciante("ana@x.com");
        reporte.setEmailDenunciado("malo@x.com");
        Publicacion pub = new Publicacion();
        pub.setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);

        when(reporteRepository.findById(reporte.getId())).thenReturn(Optional.of(reporte));
        when(usuarioRepository.findByEmailParaActualizar("malo@x.com")).thenReturn(Optional.of(malo));
        when(publicacionRepository.listarPorPropietario("malo@x.com", EstadoPublicacion.ELIMINADA)).thenReturn(List.of(pub));

        var res = service.resolver(reporte.getId(),
                new ResolverReporteRequestDTO(EstadoReporte.RESUELTO, "Cuenta suspendida", AccionAdmin.SUSPENDER_USUARIO), admin);

        assertFalse(malo.isEsActivo());
        assertEquals(EstadoPublicacion.ELIMINADA, pub.getEstadoPublicacion());
        assertEquals("RESUELTO", res.estado());
        assertEquals("SUSPENDER_USUARIO", res.accionTomada());
        assertNotNull(res.fechaResolucion());
        verify(notificacionService).crear(eq("ana@x.com"), eq(TipoNotificacion.REPORTE_ACTUALIZADO), contains("resuelto"));
    }
}
