package com.ingenieriaSoftware2.Service;

import com.ingenieriaSoftware2.Service.Implementations.GoogleBooksServiceImpl;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
        String apiKey = System.getenv("GOOGLE_BOOKS_API_KEY");
        Assumptions.assumeTrue(
                apiKey != null && !apiKey.isBlank(),
                "Saltando test contra API externa porque no hay GOOGLE_BOOKS_API_KEY configurada en el entorno"
        );
        GoogleBooksServiceImpl service = new GoogleBooksServiceImpl(
                "https://www.googleapis.com/books/v1",
                apiKey
        );
        var resultado = service.buscarPorIsbn("9780132350884");
        assertTrue(resultado.isPresent(), "El libro debería encontrarse en Google Books");
        assertTrue(resultado.get().titulo().contains("Clean Code"));
    }
}
