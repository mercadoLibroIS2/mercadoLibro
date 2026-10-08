package com.ingenieriaSoftware2.Service;

import com.ingenieriaSoftware2.DTO.Response.GoogleBookVolumeDTO;
import com.ingenieriaSoftware2.Service.Implementations.GoogleBooksServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class GoogleBooksServiceTest {

    private GoogleBooksServiceImpl googleBooksService;

    @BeforeEach
    void setUp() {
        googleBooksService = new GoogleBooksServiceImpl();
    }

    @Test
    @DisplayName("buscarPorIsbn con ISBN nulo o vacío retorna Optional.empty sin fallar")
    void buscarPorIsbn_vacio_retornaEmpty() {
        Optional<GoogleBookVolumeDTO> resultadoNull = googleBooksService.buscarPorIsbn(null);
        assertTrue(resultadoNull.isEmpty());

        Optional<GoogleBookVolumeDTO> resultadoVacio = googleBooksService.buscarPorIsbn("   ");
        assertTrue(resultadoVacio.isEmpty());
    }

    @Test
    @DisplayName("buscarPorTexto con query nula o vacía retorna lista vacía sin fallar")
    void buscarPorTexto_vacio_retornaListaVacia() {
        assertTrue(googleBooksService.buscarPorTexto(null, 5).isEmpty());
        assertTrue(googleBooksService.buscarPorTexto("   ", 5).isEmpty());
    }
}
