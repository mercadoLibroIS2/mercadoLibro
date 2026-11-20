package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Response.CadenaIntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.*;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Enums.*;
import com.ingenieriaSoftware2.Repository.CadenaIntercambioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.CadenaIntercambioService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

/** Requiere una base PostgreSQL desechable: Hibernate crea y elimina sus tablas. */
@SpringBootTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.sql.init.mode=never"})
@EnabledIfEnvironmentVariable(named = "CHAIN_TEST_POSTGRES_URL", matches = ".+")
class CadenasPostgresConcurrencyTest {
    @DynamicPropertySource
    static void postgres(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> System.getenv("CHAIN_TEST_POSTGRES_URL"));
        properties.add("spring.datasource.username", () -> System.getenv().getOrDefault("CHAIN_TEST_POSTGRES_USER", "postgres"));
        properties.add("spring.datasource.password", () -> System.getenv("CHAIN_TEST_POSTGRES_PASSWORD"));
    }

    @Autowired CadenaIntercambioService service;
    @Autowired CadenaIntercambioRepository repository;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired EntityManager entityManager;
    @Autowired ApplicationContext context;
    @Autowired JdbcTemplate jdbc;

    private TransactionTemplate tx() { return new TransactionTemplate(transactionManager); }

    @Test
    void dosInstanciasNoDuplicanAunqueLaPrimeraTodaviaNoHayaHechoCommit() throws Exception {
        long previas = repository.count();
        List<UUID> usuarios = crearCircuito(3);
        // Otra instancia: el monitor synchronized de Java no puede proteger esta prueba.
        CadenaIntercambioServiceImpl otraInstancia = new CadenaIntercambioServiceImpl();
        context.getAutowireCapableBeanFactory().autowireBean(otraInstancia);
        CountDownLatch detectadaSinCommit = new CountDownLatch(1);
        CountDownLatch permitirCommit = new CountDownLatch(1);
        CountDownLatch segundaIniciada = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primera = executor.submit(() -> tx().execute(status -> {
                var resultado = service.listarCadenas(usuarios.get(0));
                detectadaSinCommit.countDown();
                await(permitirCommit);
                return resultado;
            }));
            assertTrue(detectadaSinCommit.await(10, TimeUnit.SECONDS));
            var segunda = executor.submit(() -> tx().execute(status -> {
                segundaIniciada.countDown();
                return otraInstancia.listarCadenas(usuarios.get(1));
            }));
            try {
                assertTrue(segundaIniciada.await(5, TimeUnit.SECONDS));
                assertThrows(TimeoutException.class, () -> segunda.get(400, TimeUnit.MILLISECONDS),
                        "la segunda detección debe esperar el commit, no leer un estado anterior");
            } finally { permitirCommit.countDown(); }
            var a = primera.get(15, TimeUnit.SECONDS);
            var b = segunda.get(15, TimeUnit.SECONDS);
            assertEquals(1, a.size());
            assertEquals(a.get(0).id(), b.get(0).id());
            assertEquals(previas + 1, repository.count());
        }
        completarConcurrentemente(usuarios);
    }

    @Test
    void cuatroUsuariosAceptanYRecibenConcurrentementeSinPerderConfirmacionesNiDuplicarBonos() throws Exception {
        List<UUID> usuarios = crearCircuito(4);
        service.listarCadenas(usuarios.get(0));
        completarConcurrentemente(usuarios);
    }

    @Test
    void consolidaDuplicadasPersistidasYConservaLasAceptacionesDeAmbas() {
        List<UUID> usuarios = crearCircuito(3);
        UUID originalId = service.listarCadenas(usuarios.get(0)).get(0).id();
        UUID duplicadaId = tx().execute(status -> {
            CadenaIntercambio original = entityManager.find(CadenaIntercambio.class, originalId);
            original.getPasos().get(0).setConfirmado(true);
            CadenaIntercambio duplicada = new CadenaIntercambio();
            duplicada.setEstado(EstadoCadena.PROPUESTA);
            duplicada.setPuntosBonus(50);
            duplicada.setParticipantes(new HashSet<>(original.getParticipantes()));
            for (CadenaPaso paso : original.getPasos()) {
                CadenaPaso copia = new CadenaPaso();
                copia.setCadena(duplicada);
                copia.setOrden(paso.getOrden());
                copia.setIsbn(paso.getIsbn());
                copia.setEmailEntrega(paso.getEmailEntrega());
                copia.setEmailRecibe(paso.getEmailRecibe());
                copia.setHoraPublicacion(paso.getHoraPublicacion());
                copia.setConfirmado(paso.getOrden() == 1);
                duplicada.getPasos().add(copia);
            }
            entityManager.persist(duplicada);
            return duplicada.getId();
        });
        var visibles = service.listarCadenas(usuarios.get(0));
        assertEquals(1, visibles.size());
        var unica = visibles.get(0);
        assertEquals(2, unica.pasos().stream().filter(p -> p.confirmado()).count());
        assertEquals(1, jdbc.queryForObject("select count(*) from cadena_intercambio where id in (?, ?) and estado = 'CANCELADA'",
                Integer.class, originalId, duplicadaId));
        String pendiente = unica.pasos().stream().filter(p -> !p.confirmado()).findFirst().orElseThrow().emailEntrega();
        UUID participante = tx().execute(status -> entityManager.createQuery("select u.id from Usuario u where u.email = :email", UUID.class)
                .setParameter("email", pendiente).getSingleResult());
        UUID alias = unica.id().equals(originalId) ? duplicadaId : originalId;
        assertEquals(unica.id(), service.aceptarCadena(alias, participante).id());
        assertTrue(service.listarCadenas(usuarios.get(0)).get(0).pasos().stream().allMatch(p -> p.confirmado()));
        for (UUID usuario : usuarios) service.confirmarRecepcion(unica.id(), usuario);
        assertEquals(EstadoCadena.COMPLETADA, service.listarCadenas(usuarios.get(0)).get(0).estado());
        assertEquals(Boolean.TRUE, tx().execute(status -> usuarios.stream().allMatch(u -> entityManager.find(Usuario.class, u).getSaldoTotal() == 550)));
    }

    private void completarConcurrentemente(List<UUID> usuarios) throws Exception {
        UUID id = service.listarCadenas(usuarios.get(0)).stream()
                .filter(c -> c.estado() == EstadoCadena.PROPUESTA).findFirst().orElseThrow().id();
        ejecutarConcurrente(usuarios, u -> service.aceptarCadena(id, u));
        var aceptada = service.listarCadenas(usuarios.get(0)).stream().filter(c -> c.id().equals(id)).findFirst().orElseThrow();
        assertEquals(EstadoCadena.EN_CURSO, aceptada.estado());
        assertTrue(aceptada.pasos().stream().allMatch(p -> p.confirmado() && !p.recibido()));
        assertEquals(usuarios.size(), jdbc.queryForObject("select count(*) from publicacion where estado_publicacion = 'RESERVADA'", Integer.class));
        assertEquals(Boolean.TRUE, tx().execute(status -> usuarios.stream().allMatch(u -> entityManager.find(Usuario.class, u).getSaldoTotal() == 500)));
        ejecutarConcurrente(usuarios, u -> service.confirmarRecepcion(id, u));
        var terminada = service.listarCadenas(usuarios.get(0)).stream().filter(c -> c.id().equals(id)).findFirst().orElseThrow();
        assertEquals(EstadoCadena.COMPLETADA, terminada.estado());
        assertTrue(terminada.pasos().stream().allMatch(p -> p.recibido()));
        assertEquals(Boolean.TRUE, tx().execute(status -> usuarios.stream().allMatch(u -> {
            Usuario usuario = entityManager.find(Usuario.class, u);
            return usuario.getSaldoTotal() == 550 && usuario.getLibrosSeguidos().isEmpty();
        })));
        assertThrows(RuntimeException.class, () -> service.confirmarRecepcion(id, usuarios.get(0)));
        assertEquals(Boolean.TRUE, tx().execute(status -> usuarios.stream().allMatch(u -> entityManager.find(Usuario.class, u).getSaldoTotal() == 550)));
        // El conteo de reservadas de la siguiente prueba debe comenzar en cero.
        assertEquals(0, jdbc.queryForObject("select count(*) from publicacion where estado_publicacion = 'RESERVADA'", Integer.class));
    }

    private void ejecutarConcurrente(List<UUID> usuarios, java.util.function.Function<UUID, CadenaIntercambioResponseDTO> action) throws Exception {
        try (var executor = Executors.newFixedThreadPool(usuarios.size())) {
            var inicio = new CountDownLatch(1);
            List<Future<CadenaIntercambioResponseDTO>> futures = new ArrayList<>();
            for (UUID u : usuarios) futures.add(executor.submit(() -> { await(inicio); return action.apply(u); }));
            inicio.countDown();
            for (var future : futures) future.get(20, TimeUnit.SECONDS);
        }
    }

    private List<UUID> crearCircuito(int cantidad) {
        return tx().execute(status -> {
            String tag = UUID.randomUUID().toString();
            List<Usuario> usuarios = new ArrayList<>();
            List<Libro> libros = new ArrayList<>();
            for (int i = 0; i < cantidad; i++) {
                Usuario usuario = new Usuario();
                usuario.setEmail(tag + i + "@chain.test");
                usuario.setNombre(tag + i);
                usuario.setContrasenia("test");
                usuario.setSaldoTotal(500);
                usuario.setSaldoReservado(0);
                entityManager.persist(usuario);
                usuarios.add(usuario);
                Libro libro = new Libro();
                libro.setIsbn(tag + i);
                libro.setTitulo("Libro " + i);
                entityManager.persist(libro);
                libros.add(libro);
            }
            for (int i = 0; i < cantidad; i++) {
                Usuario propietario = usuarios.get(i);
                usuarios.get((i + 1) % cantidad).getLibrosSeguidos().add(libros.get(i));
                Publicacion publicacion = new Publicacion();
                publicacion.setId(new PublicacionId(libros.get(i).getIsbn(), propietario.getEmail(), LocalDateTime.of(2026, 1, 1, 12, i)));
                publicacion.setLibro(libros.get(i));
                publicacion.setPropietario(propietario);
                publicacion.setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);
                publicacion.setEstadoFisico(EstadoFisico.NUEVO);
                publicacion.setValorPuntosSolicitado(500);
                entityManager.persist(publicacion);
            }
            return usuarios.stream().map(Usuario::getId).toList();
        });
    }

    private static void await(CountDownLatch latch) {
        try { if (!latch.await(15, TimeUnit.SECONDS)) throw new IllegalStateException("Tiempo agotado"); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
    }
}
