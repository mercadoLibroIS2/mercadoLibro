package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.IntercambioIdParams;
import com.ingenieriaSoftware2.DTO.Request.ReporteRequestDTO;
import com.ingenieriaSoftware2.DTO.Request.ResolverReporteRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.EstadisticasAdminResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.EstadisticasAdminResponseDTO.UsuarioAdminDTO;
import com.ingenieriaSoftware2.DTO.Response.ReporteResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Intercambio;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Entity.Reporte;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.*;
import com.ingenieriaSoftware2.Repository.*;
import com.ingenieriaSoftware2.Service.Interfaces.IntercambioService;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import com.ingenieriaSoftware2.Service.Interfaces.ReporteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReporteServiceImpl implements ReporteService {

    private static final List<EstadoReporte> ABIERTOS = List.of(EstadoReporte.ABIERTO, EstadoReporte.EN_REVISION);
    private static final List<EstadoIntercambio> INTERCAMBIO_EN_CURSO = List.of(
            EstadoIntercambio.ACEPTADO,
            EstadoIntercambio.CONFIRMADO_POR_PROPONENTE,
            EstadoIntercambio.CONFIRMADO_POR_RECEPTOR);

    private final ReporteRepository reporteRepository;
    private final UsuarioRepository usuarioRepository;
    private final PublicacionRepository publicacionRepository;
    private final IntercambioRepository intercambioRepository;
    private final ReseniaRepository reseniaRepository;
    private final IntercambioService intercambioService;
    private final NotificacionService notificacionService;

    // -------------------------------------------------------------------------
    // Usuarios
    // -------------------------------------------------------------------------

    @Override
    @Transactional
    public ReporteResponseDTO crear(ReporteRequestDTO request, Usuario denunciante) {
        String emailDenunciante = denunciante.getEmail();
        Reporte reporte = new Reporte();
        reporte.setEmailDenunciante(emailDenunciante);
        reporte.setTipo(request.tipo());
        reporte.setMotivo(request.motivo());
        reporte.setDetalle(request.detalle() == null ? null : request.detalle().trim());

        switch (request.tipo()) {
            case INTERCAMBIO -> {
                IntercambioIdParams params = request.intercambio();
                if (params == null) throw badRequest("Falta indicar el intercambio.");
                Intercambio intercambio = intercambioRepository.findById(params.toId())
                        .orElseThrow(() -> notFound("El intercambio no existe."));
                IntercambioId id = intercambio.getId();
                String proponente = id.getPropietarioIdOfrecida();
                String receptor = id.getPropietarioIdSolicitante();
                if (!emailDenunciante.equalsIgnoreCase(proponente) && !emailDenunciante.equalsIgnoreCase(receptor)) {
                    throw forbidden("Solo podés reportar intercambios en los que participaste.");
                }
                reporte.setEmailDenunciado(emailDenunciante.equalsIgnoreCase(proponente) ? receptor : proponente);
                reporte.setIntercambioRef(referencia(id));
            }
            case PUBLICACION -> {
                if (request.isbn() == null || request.horaPublicacion() == null || request.emailDenunciado() == null) {
                    throw badRequest("Falta indicar la publicación.");
                }
                PublicacionId id = new PublicacionId(request.isbn(), request.emailDenunciado(), request.horaPublicacion());
                Publicacion publicacion = publicacionRepository.findById(id)
                        .orElseThrow(() -> notFound("La publicación no existe."));
                reporte.setEmailDenunciado(publicacion.getId().getEmailPropietario());
                reporte.setIsbn(id.getIsbn());
                reporte.setHoraPublicacion(id.getHoraPublicacion());
            }
            case USUARIO -> {
                String email = request.emailDenunciado();
                Usuario denunciado = email == null ? null : usuarioRepository.findByEmail(email.trim()).orElse(null);
                if (denunciado == null) throw notFound("El usuario no existe.");
                reporte.setEmailDenunciado(denunciado.getEmail());
            }
        }

        if (emailDenunciante.equalsIgnoreCase(reporte.getEmailDenunciado())) {
            throw badRequest("No podés reportarte a vos mismo.");
        }
        boolean duplicado = reporteRepository
                .findByEmailDenuncianteAndTipoAndEstadoIn(emailDenunciante, request.tipo(), ABIERTOS)
                .stream()
                .anyMatch(r -> mismoObjeto(r, reporte));
        if (duplicado) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ya tenés un reporte abierto sobre esto. Un administrador lo va a revisar.");
        }

        return ReporteResponseDTO.from(reporteRepository.save(reporte));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReporteResponseDTO> listarPropios(Usuario usuario) {
        return reporteRepository.findByEmailDenuncianteOrderByFechaDesc(usuario.getEmail())
                .stream().map(ReporteResponseDTO::from).toList();
    }

    // -------------------------------------------------------------------------
    // Administración
    // -------------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public List<ReporteResponseDTO> listarTodos(Usuario admin) {
        validarAdmin(admin);
        return reporteRepository.findAllByOrderByFechaDesc().stream().map(ReporteResponseDTO::from).toList();
    }

    @Override
    @Transactional
    public ReporteResponseDTO resolver(UUID reporteId, ResolverReporteRequestDTO request, Usuario admin) {
        validarAdmin(admin);
        if (request.estado() == EstadoReporte.ABIERTO) {
            throw badRequest("Estado de reporte no válido.");
        }
        Reporte reporte = reporteRepository.findById(reporteId)
                .orElseThrow(() -> notFound("El reporte no existe."));
        AccionAdmin accion = request.accion() == null ? AccionAdmin.NINGUNA : request.accion();

        switch (accion) {
            case CANCELAR_INTERCAMBIO -> {
                IntercambioId id = parsearReferencia(reporte.getIntercambioRef());
                if (id == null) throw badRequest("El reporte no tiene un intercambio asociado.");
                intercambioService.cancelarIntercambioComoAdmin(id);
            }
            case ELIMINAR_PUBLICACION -> {
                if (reporte.getIsbn() == null) throw badRequest("El reporte no tiene una publicación asociada.");
                PublicacionId id = new PublicacionId(reporte.getIsbn(), reporte.getEmailDenunciado(), reporte.getHoraPublicacion());
                Publicacion publicacion = publicacionRepository.findByIdParaActualizar(id)
                        .orElseThrow(() -> notFound("La publicación ya no existe."));
                if (intercambioRepository.existeIntercambioActivo(id.getIsbn(), id.getEmailPropietario(),
                        id.getHoraPublicacion(), INTERCAMBIO_EN_CURSO)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "La publicación tiene un intercambio en curso; cancelalo primero.");
                }
                intercambioService.cancelarPendientesDePublicacion(id, null);
                publicacion.setEstadoPublicacion(EstadoPublicacion.ELIMINADA);
            }
            case SUSPENDER_USUARIO -> {
                String email = reporte.getEmailDenunciado();
                if (email == null) throw badRequest("El reporte no tiene un usuario asociado.");
                if (email.equalsIgnoreCase(admin.getEmail())) throw badRequest("No podés suspender tu propia cuenta.");
                Usuario usuario = usuarioRepository.findByEmailParaActualizar(email)
                        .orElseThrow(() -> notFound("El usuario no existe."));
                usuario.setEsActivo(false);
                // Sus publicaciones disponibles salen del catálogo.
                for (Publicacion p : publicacionRepository.listarPorPropietario(email, EstadoPublicacion.ELIMINADA)) {
                    if (p.getEstadoPublicacion() == EstadoPublicacion.DISPONIBLE) {
                        intercambioService.cancelarPendientesDePublicacion(p.getId(), null);
                        p.setEstadoPublicacion(EstadoPublicacion.ELIMINADA);
                    }
                }
            }
            case NINGUNA -> {
                // Solo cambia el estado del reporte.
            }
        }

        reporte.setEstado(request.estado());
        if (request.resolucion() != null && !request.resolucion().isBlank()) {
            reporte.setResolucion(request.resolucion().trim());
        }
        if (accion != AccionAdmin.NINGUNA) reporte.setAccionTomada(accion);
        reporte.setEmailResolutor(admin.getEmail());
        if (request.estado() == EstadoReporte.RESUELTO || request.estado() == EstadoReporte.DESCARTADO) {
            reporte.setFechaResolucion(LocalDateTime.now());
        }

        avisar(reporte.getEmailDenunciante(), "Tu reporte pasó a " + etiqueta(request.estado())
                + (reporte.getResolucion() != null ? ": " + reporte.getResolucion() : "."));
        return ReporteResponseDTO.from(reporte);
    }

    @Override
    @Transactional
    public void reactivarUsuario(String email, Usuario admin) {
        validarAdmin(admin);
        Usuario usuario = usuarioRepository.findByEmailParaActualizar(email)
                .orElseThrow(() -> notFound("El usuario no existe."));
        usuario.setEsActivo(true);
    }

    @Override
    @Transactional(readOnly = true)
    public EstadisticasAdminResponseDTO estadisticas(Usuario admin) {
        validarAdmin(admin);
        List<Usuario> usuarios = usuarioRepository.findAll();
        List<Publicacion> publicaciones = publicacionRepository.findAll();
        Map<String, Long> intercambiosPorEstado = intercambioRepository.findAll().stream()
                .collect(Collectors.groupingBy(i -> i.getEstado().name(), TreeMap::new, Collectors.counting()));

        long puntos = usuarios.stream().mapToLong(u -> u.getSaldoTotal() == null ? 0 : u.getSaldoTotal()).sum();
        long reservados = usuarios.stream().mapToLong(u -> u.getSaldoReservado() == null ? 0 : u.getSaldoReservado()).sum();
        OptionalDouble reputacion = usuarios.stream()
                .filter(u -> u.getReputacionPromedio() > 0)
                .mapToDouble(Usuario::getReputacionPromedio)
                .average();
        long abiertos = reporteRepository.countByEstadoIn(ABIERTOS);

        List<UsuarioAdminDTO> suspendidos = usuarios.stream()
                .filter(u -> !u.isEsActivo())
                .map(u -> new UsuarioAdminDTO(u.getEmail(), u.getNombre(), u.getRol().name(), false))
                .toList();

        return new EstadisticasAdminResponseDTO(
                usuarios.size(),
                suspendidos.size(),
                contar(publicaciones, EstadoPublicacion.DISPONIBLE),
                contar(publicaciones, EstadoPublicacion.RESERVADA),
                contar(publicaciones, EstadoPublicacion.VENDIDA),
                intercambiosPorEstado,
                puntos,
                reservados,
                reputacion.isPresent() ? Math.round(reputacion.getAsDouble() * 10) / 10.0 : null,
                reseniaRepository.count(),
                abiertos,
                reporteRepository.count() - abiertos,
                suspendidos);
    }

    // -------------------------------------------------------------------------
    // Auxiliares
    // -------------------------------------------------------------------------

    private static long contar(List<Publicacion> publicaciones, EstadoPublicacion estado) {
        return publicaciones.stream().filter(p -> p.getEstadoPublicacion() == estado).count();
    }

    private static void validarAdmin(Usuario usuario) {
        if (usuario == null || usuario.getRol() != Rol.ADMINISTRADOR) {
            throw forbidden("Solo un administrador puede hacer esto.");
        }
    }

    private static boolean mismoObjeto(Reporte a, Reporte b) {
        return switch (b.getTipo()) {
            case INTERCAMBIO -> Objects.equals(a.getIntercambioRef(), b.getIntercambioRef());
            case PUBLICACION -> Objects.equals(a.getIsbn(), b.getIsbn())
                    && Objects.equals(a.getHoraPublicacion(), b.getHoraPublicacion());
            case USUARIO -> a.getEmailDenunciado() != null && a.getEmailDenunciado().equalsIgnoreCase(b.getEmailDenunciado());
        };
    }

    /** Mismo formato que el id de intercambio del frontend: "isbn|email|hora:isbn|email|hora". */
    static String referencia(IntercambioId id) {
        return id.getIsbnSolicitante() + "|" + id.getPropietarioIdSolicitante() + "|" + id.getHoraDePublicacionSolicitante()
                + ":" + id.getIsbnOfrecida() + "|" + id.getPropietarioIdOfrecida() + "|" + id.getHoraDePublicacionOfrecida();
    }

    static IntercambioId parsearReferencia(String ref) {
        if (ref == null) return null;
        String[] partes = ref.split("\\|");
        if (partes.length != 5) return null;
        int sep = partes[2].lastIndexOf(':');
        if (sep <= 0) return null;
        try {
            return new IntercambioId(
                    partes[0], partes[1], LocalDateTime.parse(partes[2].substring(0, sep)),
                    partes[2].substring(sep + 1), partes[3], LocalDateTime.parse(partes[4]));
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String etiqueta(EstadoReporte estado) {
        return switch (estado) {
            case ABIERTO -> "abierto";
            case EN_REVISION -> "en revisión";
            case RESUELTO -> "resuelto";
            case DESCARTADO -> "descartado";
        };
    }

    private void avisar(String email, String mensaje) {
        try {
            notificacionService.crear(email, TipoNotificacion.REPORTE_ACTUALIZADO, mensaje);
        } catch (RuntimeException e) {
            log.warn("No se pudo notificar la actualización del reporte a {}", email, e);
        }
    }

    private static ResponseStatusException badRequest(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }

    private static ResponseStatusException notFound(String msg) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, msg);
    }

    private static ResponseStatusException forbidden(String msg) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, msg);
    }
}
