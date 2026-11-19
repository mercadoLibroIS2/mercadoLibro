package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Enums.ColorSemaforo;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Mapper.PublicacionMapper;
import com.ingenieriaSoftware2.Service.Implementations.Auxiliares.PoliticaPuntos;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class PoliticaPuntosTest {
    @Test
    void libroPromedioYBonosCompartenLaEscala500() {
        Libro libro = new Libro();
        assertEquals(400, PoliticaPuntos.referencia(libro, EstadoFisico.BUEN_ESTADO));
        assertEquals(500, PoliticaPuntos.referencia(libro, EstadoFisico.NUEVO));
        assertEquals(450, PoliticaPuntos.referencia(libro, EstadoFisico.COMO_NUEVO));
        assertEquals(325, PoliticaPuntos.referencia(libro, EstadoFisico.ACEPTABLE));
        assertEquals(225, PoliticaPuntos.referencia(libro, EstadoFisico.DETERIORADO));
        assertEquals(500, PoliticaPuntos.PUNTOS_INICIALES);
        assertEquals(50, PoliticaPuntos.BONO_TRUEQUE);
        assertEquals(25, PoliticaPuntos.BONO_RESENIA);
        assertEquals(50, PoliticaPuntos.BONO_CADENA);
    }

    @Test
    void valoracionExternaNoModificaElPrecioYSemaforoTieneLimitesConsistentes() {
        Libro libro = new Libro();
        libro.setPuntuacionExterna(BigDecimal.ZERO);
        assertEquals(400, PoliticaPuntos.referencia(libro, EstadoFisico.BUEN_ESTADO));
        libro.setPuntuacionExterna(new BigDecimal("5.0"));
        assertEquals(400, PoliticaPuntos.referencia(libro, EstadoFisico.BUEN_ESTADO));
        assertEquals(ColorSemaforo.VERDE, PoliticaPuntos.color(550, 500));
        assertEquals(ColorSemaforo.AMARILLO, PoliticaPuntos.color(555, 500));
        assertEquals(ColorSemaforo.AMARILLO, PoliticaPuntos.color(650, 500));
        assertEquals(ColorSemaforo.ROJO, PoliticaPuntos.color(655, 500));
        assertEquals(ColorSemaforo.SIN_REFERENCIA, PoliticaPuntos.color(500, null));
    }

    @Test
    void categoriaYPaginasDistinguenLibrosYLimitanElAjuste() {
        Libro tecnico = new Libro();
        tecnico.setCategoriaReferencia("Técnico");
        tecnico.setPaginas(500);
        assertEquals(715, PoliticaPuntos.referencia(tecnico, EstadoFisico.NUEVO));
        assertEquals(570, PoliticaPuntos.referencia(tecnico, EstadoFisico.BUEN_ESTADO));
        Libro infantil = new Libro();
        infantil.setCategoriaReferencia("Infantil");
        infantil.setPaginas(100);
        assertEquals(315, PoliticaPuntos.referencia(infantil, EstadoFisico.NUEVO));
        assertEquals(0.8505, PoliticaPuntos.factorPaginas(1), 0.000001);
        assertEquals(1.15, PoliticaPuntos.factorPaginas(10000));
        assertEquals(1.0, PoliticaPuntos.factorPaginas(null));
        assertEquals(1.0, PoliticaPuntos.factorPaginas(0));
        assertEquals("Infantil", PoliticaPuntos.normalizarCategorias(java.util.List.of("Juvenile Fiction")));
        assertEquals("Técnico", PoliticaPuntos.normalizarCategorias(java.util.List.of("Computers / Programming")));
        assertEquals("Sin clasificar", PoliticaPuntos.normalizarCategorias(java.util.List.of("Unknown")));
    }

    @Test
    void catalogoRecalculaCacheAntiguoSinCambiarPrecioNiHistorial() {
        Libro libro = new Libro();
        libro.setValorReferencia(100); // Caché anterior: no puede volver a definir la escala.
        Publicacion publicacion = new Publicacion();
        publicacion.setLibro(libro);
        publicacion.setEstadoFisico(EstadoFisico.BUEN_ESTADO);
        publicacion.setValorPuntosSolicitado(600);
        publicacion.setValorReferenciaCalculado(80);
        publicacion.setColorSemaforo(ColorSemaforo.ROJO);
        PublicacionMapper mapper = new PublicacionMapper();

        for (EstadoPublicacion estado : new EstadoPublicacion[]{EstadoPublicacion.DISPONIBLE, EstadoPublicacion.RESERVADA}) {
            publicacion.setEstadoPublicacion(estado);
            var dto = mapper.toDTO(publicacion);
            assertEquals(400, dto.valorReferenciaCalculado());
            assertEquals(ColorSemaforo.ROJO, dto.colorSemaforo());
            assertEquals(600, dto.valorPuntosSolicitado());
        }
        publicacion.setEstadoPublicacion(EstadoPublicacion.VENDIDA);
        assertEquals(80, mapper.toDTO(publicacion).valorReferenciaCalculado());
        assertEquals(ColorSemaforo.ROJO, mapper.toDTO(publicacion).colorSemaforo());
        assertEquals(100, libro.getValorReferencia());
        assertEquals(80, publicacion.getValorReferenciaCalculado());
    }
}
