package com.ingenieriaSoftware2.Service;

import com.ingenieriaSoftware2.Service.Implementations.GoogleBooksServiceImpl;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class GoogleBooksServiceTest {

    private final GoogleBooksServiceImpl googleBooksService = new GoogleBooksServiceImpl();

    @Test
    void buscarPorIsbnConEntradaVaciaRetornaEmpty() {
        assertTrue(googleBooksService.buscarPorIsbn(null).isEmpty());
        assertTrue(googleBooksService.buscarPorIsbn(" - ").isEmpty());
    }

    @Test
    void buscarPorTextoConEntradaVaciaRetornaListaVacia() {
        assertTrue(googleBooksService.buscarPorTexto(null, 10).isEmpty());
        assertTrue(googleBooksService.buscarPorTexto("   ", 10).isEmpty());
    }

    @Test
    void constructorConApiKeyYBaseUrl() {
        GoogleBooksServiceImpl service = new GoogleBooksServiceImpl("https://www.googleapis.com/books/v1", "test-key");
        assertTrue(service.buscarPorIsbn(null).isEmpty());
        assertTrue(service.buscarPorTexto("", 5).isEmpty());
    }

    @Test
    void consultarLibroRealPorIsbn() {
        GoogleBooksServiceImpl service = new GoogleBooksServiceImpl(
                "https://www.googleapis.com/books/v1",
                "AIzaSyCVzUDKyyxw_QRFShH6BEuEuhL9LHh4NDI"
        );
        var resultado = service.buscarPorIsbn("9780132350884");
        // Depende de la API externa (key vigente, cuota, red): si no responde se omite en vez de romper el build
        assumeTrue(resultado.isPresent(), "Google Books no disponible (API key vencida, cuota o red)");
        assertTrue(resultado.get().titulo().contains("Clean Code"));
    }
}
