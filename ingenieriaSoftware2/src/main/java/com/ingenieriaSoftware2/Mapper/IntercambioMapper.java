package com.ingenieriaSoftware2.Mapper;

import com.ingenieriaSoftware2.DTO.Response.IntercambioResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;
import com.ingenieriaSoftware2.Entity.Intercambio;
import org.springframework.stereotype.Component;

@Component
public class IntercambioMapper {

    public IntercambioResponseDTO toDTO(Intercambio intercambio) {
        IntercambioId id = intercambio.getId();
        return new IntercambioResponseDTO(
                id.getIsbnOfrecida(),
                intercambio.getPublicacionOfrecida().getLibro().getTitulo(),
                id.getPropietarioIdOfrecida(),
                id.getHoraDePublicacionOfrecida(),
                id.getIsbnSolicitante(),
                intercambio.getPublicacionSolicitante().getLibro().getTitulo(),
                id.getPropietarioIdSolicitante(),
                id.getHoraDePublicacionSolicitante(),
                intercambio.getEstado(),
                intercambio.getPuntosComprometidos(),
                intercambio.getMotivoRechazo(),
                nombreDuenio(intercambio.getPublicacionOfrecida()),
                nombreDuenio(intercambio.getPublicacionSolicitante()),
                pagaCompensacion(intercambio)
        );
    }

    // Igual que IntercambioServiceImpl.calcularDiferencia: positiva => paga el proponente (ofrecida)
    private static String pagaCompensacion(Intercambio intercambio) {
        Integer puntos = intercambio.getPuntosComprometidos();
        if (puntos == null || puntos == 0) {
            return null;
        }
        com.ingenieriaSoftware2.Entity.Publicacion ofrecida = intercambio.getPublicacionOfrecida();
        com.ingenieriaSoftware2.Entity.Publicacion solicitada = intercambio.getPublicacionSolicitante();
        if (ofrecida == null || solicitada == null
                || ofrecida.getValorReferenciaCalculado() == null || solicitada.getValorReferenciaCalculado() == null) {
            return null;
        }
        int diferencia = solicitada.getValorReferenciaCalculado() - ofrecida.getValorReferenciaCalculado();
        return diferencia > 0
                ? intercambio.getId().getPropietarioIdOfrecida()
                : intercambio.getId().getPropietarioIdSolicitante();
    }

    private static String nombreDuenio(com.ingenieriaSoftware2.Entity.Publicacion publicacion) {
        if (publicacion == null) {
            return null;
        }
        com.ingenieriaSoftware2.Entity.Usuario duenio = publicacion.getPropietario();
        return duenio != null ? duenio.getNombre() : null;
    }
}