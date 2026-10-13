package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Enums.EstadoIntercambio;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Exception.Intercambio.AccionNoPermitidaException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoDisponibleException;
import com.ingenieriaSoftware2.Mapper.PublicacionMapper;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Repository.PublicacionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicacionServiceImplTest {

    private static final PublicacionId ID =
            new PublicacionId("978-1", "duena@example.com", LocalDateTime.parse("2026-01-01T12:00:00"));

    @Mock
    private PublicacionRepository publicacionRepository;

    @Mock
    private IntercambioRepository intercambioRepository;

    @Mock
    private PublicacionMapper publicacionMapper;

    @InjectMocks
    private PublicacionServiceImpl publicacionService;

    @Test
    void listarDisponiblesConsultaSoloElEstadoDisponible() {
        when(publicacionRepository.listarPorEstado(EstadoPublicacion.DISPONIBLE)).thenReturn(List.of());

        publicacionService.listarPublicacionesDisponibles();

        verify(publicacionRepository).listarPorEstado(EstadoPublicacion.DISPONIBLE);
    }

    @Test
    void eliminarRechazaAlUsuarioQueNoEsDuenio() {
        assertThrows(AccionNoPermitidaException.class,
                () -> publicacionService.eliminarPublicacion(ID, "otra@example.com"));

        verifyNoInteractions(publicacionRepository, intercambioRepository);
    }

    @Test
    void eliminarRechazaPublicacionesReservadas() {
        Publicacion publicacion = new Publicacion();
        publicacion.setEstadoPublicacion(EstadoPublicacion.RESERVADA);
        when(publicacionRepository.findByIdParaActualizar(ID)).thenReturn(Optional.of(publicacion));

        assertThrows(PublicacionNoDisponibleException.class,
                () -> publicacionService.eliminarPublicacion(ID, ID.getEmailPropietario()));

        verifyNoInteractions(intercambioRepository);
    }

    @Test
    void eliminarRechazaPublicacionesConIntercambioActivo() {
        Publicacion publicacion = new Publicacion();
        publicacion.setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);
        when(publicacionRepository.findByIdParaActualizar(ID)).thenReturn(Optional.of(publicacion));
        when(intercambioRepository.existeIntercambioActivo(
                eq(ID.getIsbn()), eq(ID.getEmailPropietario()), eq(ID.getHoraPublicacion()), anyList()))
                .thenReturn(true);

        assertThrows(PublicacionNoDisponibleException.class,
                () -> publicacionService.eliminarPublicacion(ID, ID.getEmailPropietario()));
    }

    @Test
    void eliminarMarcaComoEliminadaSinBorrarElRegistroCuandoEstaDisponible() {
        Publicacion publicacion = new Publicacion();
        publicacion.setEstadoPublicacion(EstadoPublicacion.DISPONIBLE);
        when(publicacionRepository.findByIdParaActualizar(ID)).thenReturn(Optional.of(publicacion));
        when(intercambioRepository.existeIntercambioActivo(
                eq(ID.getIsbn()), eq(ID.getEmailPropietario()), eq(ID.getHoraPublicacion()), anyList()))
                .thenReturn(false);

        publicacionService.eliminarPublicacion(ID, ID.getEmailPropietario());

        assertEquals(EstadoPublicacion.ELIMINADA, publicacion.getEstadoPublicacion());
        verify(intercambioRepository).existeIntercambioActivo(
                eq(ID.getIsbn()), eq(ID.getEmailPropietario()), eq(ID.getHoraPublicacion()), anyList());
    }
}
