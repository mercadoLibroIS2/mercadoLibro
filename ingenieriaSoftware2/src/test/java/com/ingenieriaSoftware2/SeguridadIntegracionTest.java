package com.ingenieriaSoftware2;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas de integración de punta a punta contra el servidor real (H2 en memoria):
 * cubren los arreglos de seguridad y de manejo de errores.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:integracion;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;INIT=RUNSCRIPT FROM 'classpath:h2-enums.sql'",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "jwt.secret=clave-de-pruebas-con-mas-de-32-caracteres-para-hs256",
        "spring.jpa.show-sql=false"
})
class SeguridadIntegracionTest {

    @LocalServerPort
    int port;

    private final HttpClient http = HttpClient.newHttpClient();
    private String token;
    private String email;

    @BeforeEach
    void registrarUsuario() throws Exception {
        String sufijo = UUID.randomUUID().toString().substring(0, 8);
        email = "test" + sufijo + "@mail.com";
        HttpResponse<String> registro = post("/api/auth/registro", """
                {"nombre":"user%s","email":"%s","contrasenia":"Secreta123"}
                """.formatted(sufijo, email), null);
        assertThat(registro.statusCode()).isEqualTo(201);
        token = campo(registro.body(), "token");
        assertThat(token).isNotBlank();
    }

    @Test
    void pingEsPublico() throws Exception {
        assertThat(get("/api/test/ping", null).statusCode()).isEqualTo(200);
    }

    @Test
    void losEndpointsPeligrososDeTestYaNoSonAccesibles() throws Exception {
        assertThat(post("/api/test/reset-and-init-schema", "{}", null).statusCode()).isIn(401, 403);
        assertThat(get("/api/test/db-tables", null).statusCode()).isIn(401, 403);
        // Aun con login, ya no existen.
        assertThat(post("/api/test/reset-and-init-schema", "{}", token).statusCode()).isEqualTo(404);
    }

    @Test
    void perfilPropioConTokenValido() throws Exception {
        HttpResponse<String> perfil = get("/api/usuario/me", token);
        assertThat(perfil.statusCode()).isEqualTo(200);
        assertThat(perfil.body()).contains(email);
    }

    @Test
    void tokenInvalidoNoProvocaError500() throws Exception {
        assertThat(get("/api/usuario/me", "token.invalido.xyz").statusCode()).isIn(401, 403);
    }

    @Test
    void librosSeguidosSonDelUsuarioLogueado() throws Exception {
        HttpResponse<String> seguidos = get("/api/usuario/me/libros-seguidos", token);
        assertThat(seguidos.statusCode()).isEqualTo(200);
        assertThat(seguidos.body()).isEqualTo("[]");
        // La ruta vieja que recibía el id de otro usuario por URL ya no existe.
        assertThat(get("/api/usuario/" + UUID.randomUUID() + "/libros-seguidos", token).statusCode()).isNotEqualTo(200);
    }

    @Test
    void reseniaDeIntercambioInexistenteDevuelve404YNo500() throws Exception {
        HttpResponse<String> respuesta = post("/api/resenia", """
                {"intercambioId":{"isbnSolicitante":"1","propietarioIdSolicitante":"a@a.com",
                 "horaDePublicacionSolicitante":"2026-01-01T10:00:00","isbnOfrecida":"2",
                 "propietarioIdOfrecida":"b@b.com","horaDePublicacionOfrecida":"2026-01-01T10:00:00"},
                 "calificacion":5,"comentario":"Excelente"}
                """, token);
        assertThat(respuesta.statusCode()).isEqualTo(404);
    }

    @Test
    void notificacionesDelUsuario() throws Exception {
        HttpResponse<String> cantidad = get("/api/notificacion/no-leidas/cantidad", token);
        assertThat(cantidad.statusCode()).isEqualTo(200);
        assertThat(cantidad.body()).contains("\"cantidad\":0");
    }

    @Test
    void consultarSaldoPropio() throws Exception {
        HttpResponse<String> saldo = get("/api/movimientoPuntos/saldo", token);
        assertThat(saldo.statusCode()).isEqualTo(200);
    }

    // ---------- helpers ----------

    private HttpResponse<String> get(String path, String bearer) throws IOException, InterruptedException {
        HttpRequest.Builder req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET();
        if (bearer != null) req.header("Authorization", "Bearer " + bearer);
        return http.send(req.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String path, String json, String bearer) throws IOException, InterruptedException {
        HttpRequest.Builder req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json));
        if (bearer != null) req.header("Authorization", "Bearer " + bearer);
        return http.send(req.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String campo(String json, String nombre) {
        Matcher m = Pattern.compile("\"" + nombre + "\"\\s*:\\s*\"([^\"]+)\"").matcher(json);
        return m.find() ? m.group(1) : null;
    }
}
