package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.CadenaIntercambioRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;
import com.ingenieriaSoftware2.DTO.Response.CadenaPasoResponseDTO;
import com.ingenieriaSoftware2.Entity.CadenaIntercambio;
import com.ingenieriaSoftware2.Entity.CadenaPaso;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCadena;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Enums.TipoNotificacion;
import com.ingenieriaSoftware2.Exception.Intercambio.AccionNoPermitidaException;
import com.ingenieriaSoftware2.Repository.CadenaIntercambioRepository;
import com.ingenieriaSoftware2.Repository.PublicacionRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.CadenaIntercambioService;
import com.ingenieriaSoftware2.Service.Interfaces.MovimientoPuntosService;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/**
 * Cadenas circulares de intercambio (RF46).
 *
 * Se detectan a partir de las publicaciones DISPONIBLES y del Tracker: hay una arista
 * A → B cuando A tiene publicado un libro que B sigue. Un ciclo de 3 a {@value #MAX_PARTICIPANTES}
 * usuarios distintos es una cadena: cada uno entrega su libro al siguiente y recibe el del anterior.
 * Cada participante confirma su parte; cuando confirman todos, las publicaciones pasan a VENDIDA,
 * los receptores dejan de seguir el libro recibido y cada participante recibe la bonificación.
 */
@Service
public class CadenaIntercambioServiceImpl implements CadenaIntercambioService {

    static final int MIN_PARTICIPANTES = 3;
    static final int MAX_PARTICIPANTES = 5;
    static final int PUNTOS_BONUS_CADENA = 50;

    @Autowired
    private CadenaIntercambioRepository cadenaIntercambioRepository;

    @Autowired(required = false)
    private UsuarioRepository usuarioRepository;

    @Autowired(required = false)
    private PublicacionRepository publicacionRepository;

    @Autowired(required = false)
    private MovimientoPuntosService movimientoPuntosService;

    @Autowired(required = false)
    private NotificacionService notificacionService;

    private record Arista(String destino, Publicacion publicacion) {
    }

    @Override
    @Transactional
    public synchronized List<CadenaIntercambioResponseDTO> listarCadenas(UUID usuarioId) {
        detectarCadenas();
        return cadenaIntercambioRepository.findAll().stream()
                .filter(c -> usuarioId == null || esParticipante(c, usuarioId))
                .map(this::toDTO)
                .toList();
    }

    /** Busca ciclos nuevos y los guarda como cadenas PROPUESTA. Devuelve cuántas creó. */
    @Transactional
    public synchronized int detectarCadenas() {
        if (publicacionRepository == null) {
            return 0;
        }

        List<CadenaIntercambio> existentes = cadenaIntercambioRepository.findAll();
        Set<String> publicacionesOcupadas = new HashSet<>();
        Set<Set<String>> combinacionesDescartadas = new HashSet<>();
        for (CadenaIntercambio c : existentes) {
            Set<String> claves = new HashSet<>();
            for (CadenaPaso paso : c.getPasos()) {
                claves.add(clave(paso.getIsbn(), paso.getEmailEntrega(), paso.getHoraPublicacion().toString()));
            }
            if (c.getEstado() == EstadoCadena.PROPUESTA || c.getEstado() == EstadoCadena.EN_CURSO) {
                publicacionesOcupadas.addAll(claves);
            } else if (c.getEstado() == EstadoCadena.CANCELADA && !claves.isEmpty()) {
                // Una cadena rechazada no se vuelve a proponer con exactamente las mismas publicaciones
                combinacionesDescartadas.add(claves);
            }
        }

        Map<String, List<Arista>> grafo = construirGrafo(publicacionesOcupadas);

        int creadas = 0;
        Set<String> usuariosUsados = new HashSet<>();
        for (String inicio : new TreeSet<>(grafo.keySet())) {
            if (usuariosUsados.contains(inicio)) {
                continue;
            }
            List<Arista> ciclo = buscarCiclo(grafo, inicio, usuariosUsados, combinacionesDescartadas);
            if (ciclo != null) {
                crearCadenaDetectada(inicio, ciclo);
                usuariosUsados.add(inicio);
                ciclo.forEach(a -> usuariosUsados.add(a.destino()));
                creadas++;
            }
        }
        return creadas;
    }

    private Map<String, List<Arista>> construirGrafo(Set<String> publicacionesOcupadas) {
        Map<String, List<Arista>> grafo = new HashMap<>();
        for (Publicacion pub : publicacionRepository.listarPorEstado(EstadoPublicacion.DISPONIBLE)) {
            PublicacionId id = pub.getId();
            if (pub.getLibro() == null
                    || publicacionesOcupadas.contains(clave(id.getIsbn(), id.getEmailPropietario(), id.getHoraPublicacion().toString()))) {
                continue;
            }
            String duenio = id.getEmailPropietario();
            for (Usuario seguidor : pub.getLibro().getSeguidores()) {
                String email = seguidor.getEmail();
                if (email != null && !email.equalsIgnoreCase(duenio)) {
                    grafo.computeIfAbsent(duenio, k -> new ArrayList<>()).add(new Arista(email, pub));
                }
            }
        }
        // Orden estable para que la detección sea determinística
        grafo.values().forEach(l -> l.sort(Comparator.comparing(Arista::destino)));
        return grafo;
    }

    /** DFS desde {@code inicio}; solo visita usuarios "mayores" para no encontrar el mismo ciclo rotado. */
    private List<Arista> buscarCiclo(Map<String, List<Arista>> grafo, String inicio,
                                     Set<String> usuariosUsados, Set<Set<String>> descartadas) {
        Deque<Arista> camino = new ArrayDeque<>();
        Set<String> visitados = new HashSet<>();
        visitados.add(inicio);
        return dfs(grafo, inicio, inicio, camino, visitados, usuariosUsados, descartadas);
    }

    private List<Arista> dfs(Map<String, List<Arista>> grafo, String inicio, String actual, Deque<Arista> camino,
                             Set<String> visitados, Set<String> usuariosUsados, Set<Set<String>> descartadas) {
        for (Arista arista : grafo.getOrDefault(actual, List.of())) {
            String siguiente = arista.destino();
            if (siguiente.equals(inicio)) {
                if (camino.size() + 1 >= MIN_PARTICIPANTES) {
                    List<Arista> ciclo = new ArrayList<>(camino);
                    ciclo.add(arista);
                    if (!descartadas.contains(clavesDe(ciclo))) {
                        return ciclo;
                    }
                }
                continue;
            }
            if (camino.size() + 1 >= MAX_PARTICIPANTES
                    || visitados.contains(siguiente)
                    || usuariosUsados.contains(siguiente)
                    || siguiente.compareTo(inicio) < 0) {
                continue;
            }
            camino.addLast(arista);
            visitados.add(siguiente);
            List<Arista> encontrado = dfs(grafo, inicio, siguiente, camino, visitados, usuariosUsados, descartadas);
            if (encontrado != null) {
                return encontrado;
            }
            visitados.remove(siguiente);
            camino.removeLast();
        }
        return null;
    }

    private Set<String> clavesDe(List<Arista> ciclo) {
        Set<String> claves = new HashSet<>();
        for (Arista a : ciclo) {
            PublicacionId id = a.publicacion().getId();
            claves.add(clave(id.getIsbn(), id.getEmailPropietario(), id.getHoraPublicacion().toString()));
        }
        return claves;
    }

    private void crearCadenaDetectada(String inicio, List<Arista> ciclo) {
        CadenaIntercambio cadena = new CadenaIntercambio();
        cadena.setEstado(EstadoCadena.PROPUESTA);
        cadena.setPuntosBonus(PUNTOS_BONUS_CADENA);

        Set<Usuario> participantes = new LinkedHashSet<>();
        String entrega = inicio;
        int orden = 0;
        for (Arista arista : ciclo) {
            PublicacionId id = arista.publicacion().getId();
            CadenaPaso paso = new CadenaPaso();
            paso.setCadena(cadena);
            paso.setOrden(orden++);
            paso.setEmailEntrega(entrega);
            paso.setEmailRecibe(arista.destino());
            paso.setIsbn(id.getIsbn());
            paso.setHoraPublicacion(id.getHoraPublicacion());
            paso.setConfirmado(false);
            cadena.getPasos().add(paso);
            if (arista.publicacion().getPropietario() != null) {
                participantes.add(arista.publicacion().getPropietario());
            }
            entrega = arista.destino();
        }
        cadena.setParticipantes(participantes);
        cadenaIntercambioRepository.save(cadena);

        for (Usuario u : participantes) {
            notificar(u.getEmail(), TipoNotificacion.INTERCAMBIO_SOLICITADO);
        }
    }

    @Override
    @Transactional
    public CadenaIntercambioResponseDTO crearCadena(CadenaIntercambioRequestDTO dto) {
        CadenaIntercambio cadena = new CadenaIntercambio();
        cadena.setPuntosBonus(dto != null && dto.puntosBonus() != null ? dto.puntosBonus() : PUNTOS_BONUS_CADENA);
        cadena.setEstado(EstadoCadena.PROPUESTA);

        Set<Usuario> participantes = new LinkedHashSet<>();
        if (dto != null && dto.participantesEmails() != null && usuarioRepository != null) {
            for (String email : dto.participantesEmails()) {
                if (email != null && !email.isBlank()) {
                    Usuario usuario = usuarioRepository.findByEmail(email)
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.NOT_FOUND, "Usuario no encontrado: " + email));
                    participantes.add(usuario);
                }
            }
        }
        cadena.setParticipantes(participantes);

        return toDTO(cadenaIntercambioRepository.save(cadena));
    }

    @Override
    @Transactional
    public synchronized CadenaIntercambioResponseDTO aceptarCadena(UUID cadenaId, UUID usuarioId) {
        CadenaIntercambio cadena = buscarCadena(cadenaId);

        if (cadena.getEstado() == EstadoCadena.CANCELADA || cadena.getEstado() == EstadoCadena.COMPLETADA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La cadena no puede ser aceptada en su estado actual");
        }

        validarParticipante(cadena, usuarioId);

        if (cadena.getPasos().isEmpty()) {
            // Cadena creada manualmente, sin libros asociados
            cadena.setEstado(cadena.getEstado() == EstadoCadena.PROPUESTA ? EstadoCadena.EN_CURSO : EstadoCadena.COMPLETADA);
            return toDTO(cadenaIntercambioRepository.save(cadena));
        }

        String email = emailDe(cadena, usuarioId);
        CadenaPaso propio = cadena.getPasos().stream()
                .filter(p -> p.getEmailEntrega().equalsIgnoreCase(email))
                .findFirst()
                .orElseThrow(() -> new AccionNoPermitidaException("El usuario no forma parte de esta cadena"));
        if (propio.isConfirmado()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya confirmaste tu participación en esta cadena");
        }
        propio.setConfirmado(true);

        boolean todosConfirmaron = cadena.getPasos().stream().allMatch(CadenaPaso::isConfirmado);
        if (todosConfirmaron) {
            completar(cadena);
        } else {
            cadena.setEstado(EstadoCadena.EN_CURSO);
        }
        return toDTO(cadenaIntercambioRepository.save(cadena));
    }

    /** Transfiere los libros y acredita el bono. Si algún libro dejó de estar disponible, se cancela. */
    private void completar(CadenaIntercambio cadena) {
        List<Publicacion> publicaciones = new ArrayList<>();
        for (CadenaPaso paso : cadena.getPasos()) {
            Optional<Publicacion> pub = publicacionRepository.findByIdParaActualizar(
                    new PublicacionId(paso.getIsbn(), paso.getEmailEntrega(), paso.getHoraPublicacion()));
            if (pub.isEmpty() || pub.get().getEstadoPublicacion() != EstadoPublicacion.DISPONIBLE) {
                cadena.setEstado(EstadoCadena.CANCELADA);
                return;
            }
            publicaciones.add(pub.get());
        }

        publicaciones.forEach(p -> p.setEstadoPublicacion(EstadoPublicacion.VENDIDA));
        publicacionRepository.saveAll(publicaciones);

        int bonus = cadena.getPuntosBonus() != null ? cadena.getPuntosBonus() : PUNTOS_BONUS_CADENA;
        for (CadenaPaso paso : cadena.getPasos()) {
            Usuario receptor = usuarioRepository != null
                    ? usuarioRepository.findByEmail(paso.getEmailRecibe()).orElse(null)
                    : null;
            if (receptor == null) {
                continue;
            }
            // Ya consiguió el libro que buscaba: deja de seguirlo
            receptor.getLibrosSeguidos().removeIf(l -> paso.getIsbn().equals(l.getIsbn()));
            usuarioRepository.save(receptor);
            if (movimientoPuntosService != null) {
                movimientoPuntosService.acreditarBonificacionSistema(receptor, bonus, "Bonificación por cadena de intercambio");
            }
            notificar(receptor.getEmail(), TipoNotificacion.INTERCAMBIO_COMPLETADO);
            notificar(receptor.getEmail(), TipoNotificacion.PUNTOS_GANADOS);
        }
        cadena.setEstado(EstadoCadena.COMPLETADA);
    }

    @Override
    @Transactional
    public synchronized CadenaIntercambioResponseDTO rechazarCadena(UUID cadenaId, UUID usuarioId) {
        CadenaIntercambio cadena = buscarCadena(cadenaId);

        if (cadena.getEstado() == EstadoCadena.COMPLETADA || cadena.getEstado() == EstadoCadena.CANCELADA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La cadena ya fue completada o cancelada");
        }

        validarParticipante(cadena, usuarioId);

        cadena.setEstado(EstadoCadena.CANCELADA);
        return toDTO(cadenaIntercambioRepository.save(cadena));
    }

    private CadenaIntercambio buscarCadena(UUID cadenaId) {
        return cadenaIntercambioRepository.findById(cadenaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cadena no encontrada"));
    }

    private boolean esParticipante(CadenaIntercambio cadena, UUID usuarioId) {
        return cadena.getParticipantes() != null
                && cadena.getParticipantes().stream().anyMatch(u -> usuarioId.equals(u.getId()));
    }

    private String emailDe(CadenaIntercambio cadena, UUID usuarioId) {
        return cadena.getParticipantes().stream()
                .filter(u -> usuarioId != null && usuarioId.equals(u.getId()))
                .map(Usuario::getEmail)
                .findFirst()
                .orElseThrow(() -> new AccionNoPermitidaException("El usuario no forma parte de esta cadena"));
    }

    private void validarParticipante(CadenaIntercambio cadena, UUID usuarioId) {
        if (usuarioId != null && cadena.getParticipantes() != null && !cadena.getParticipantes().isEmpty()
                && !esParticipante(cadena, usuarioId)) {
            throw new AccionNoPermitidaException("El usuario no forma parte de esta cadena");
        }
    }

    private void notificar(String email, TipoNotificacion tipo) {
        if (notificacionService == null || email == null) {
            return;
        }
        try {
            notificacionService.crear(email, tipo);
        } catch (RuntimeException ignored) {
            // Una notificación fallida no debe impedir la operación
        }
    }

    private static String clave(String isbn, String email, String hora) {
        return isbn + "|" + email + "|" + hora;
    }

    private CadenaIntercambioResponseDTO toDTO(CadenaIntercambio cadena) {
        List<String> emails = cadena.getParticipantes() != null
                ? cadena.getParticipantes().stream().map(Usuario::getEmail).toList()
                : List.of();

        Map<String, String> nombres = new HashMap<>();
        if (cadena.getParticipantes() != null) {
            cadena.getParticipantes().forEach(u -> nombres.put(u.getEmail(), u.getNombre()));
        }

        List<CadenaPasoResponseDTO> pasos = new ArrayList<>();
        for (CadenaPaso paso : cadena.getPasos()) {
            Publicacion pub = publicacionRepository != null
                    ? publicacionRepository.findById(new PublicacionId(paso.getIsbn(), paso.getEmailEntrega(), paso.getHoraPublicacion())).orElse(null)
                    : null;
            pasos.add(new CadenaPasoResponseDTO(
                    paso.getEmailEntrega(),
                    nombres.getOrDefault(paso.getEmailEntrega(), paso.getEmailEntrega()),
                    paso.getEmailRecibe(),
                    paso.getIsbn(),
                    paso.getHoraPublicacion(),
                    pub != null && pub.getLibro() != null ? pub.getLibro().getTitulo() : null,
                    pub != null && pub.getLibro() != null ? pub.getLibro().getAutores() : null,
                    pub != null ? pub.getEstadoFisico() : null,
                    pub != null ? pub.getValorPuntosSolicitado() : null,
                    paso.isConfirmado()
            ));
        }

        return new CadenaIntercambioResponseDTO(
                cadena.getId(),
                cadena.getPuntosBonus(),
                cadena.getEstado(),
                emails,
                pasos
        );
    }
}
