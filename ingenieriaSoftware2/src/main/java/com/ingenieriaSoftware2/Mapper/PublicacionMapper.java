package com.ingenieriaSoftware2.Mapper;

import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.DTO.Response.PublicacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Service.Implementations.Auxiliares.PoliticaPuntos;
import org.springframework.stereotype.Component;

@Component
public class PublicacionMapper {
    public PublicacionResponseDTO toDTO(Publicacion publicacion){
        PublicacionId publicacionId = publicacion.getId();
        String titulo = (publicacion.getLibro() != null && publicacion.getLibro().getTitulo() != null)
                ? publicacion.getLibro().getTitulo()
                : "";
        String autor = (publicacion.getLibro() != null && publicacion.getLibro().getAutores() != null)
                ? publicacion.getLibro().getAutores()
                : "";
        String isbn = (publicacionId != null && publicacionId.getIsbn() != null)
                ? publicacionId.getIsbn().replaceAll("[^0-9X]", "")
                : "";
        String portadaUrl = !isbn.isEmpty()
                ? "https://covers.openlibrary.org/b/isbn/" + isbn + "-M.jpg"
                : "";

        Usuario propietario = publicacion.getPropietario();
        String nombrePropietario = propietario != null ? propietario.getNombre() : null;

        // Las referencias son orientativas: actualizar la escala del catálogo no cambia
        // el precio elegido ni las reservas/compensaciones ya acordadas.
        boolean activa = publicacion.getEstadoPublicacion() == EstadoPublicacion.DISPONIBLE
                || publicacion.getEstadoPublicacion() == EstadoPublicacion.RESERVADA;
        Integer referencia = activa
                ? PoliticaPuntos.referencia(publicacion.getLibro(), publicacion.getEstadoFisico())
                : publicacion.getValorReferenciaCalculado();

        return new PublicacionResponseDTO(
                publicacionId,
                titulo,
                autor,
                portadaUrl,
                publicacion.getEstadoFisico(),
                publicacion.getValorPuntosSolicitado(),
                referencia,
                activa ? PoliticaPuntos.color(publicacion.getValorPuntosSolicitado(), referencia) : publicacion.getColorSemaforo(),
                publicacion.getComentario(),
                nombrePropietario,
                publicacion.getEstadoPublicacion(),
                propietario != null ? propietario.getReputacionPromedio() : null,
                publicacion.getLibro() != null && publicacion.getLibro().getPuntuacionExterna() != null
                        ? publicacion.getLibro().getPuntuacionExterna().doubleValue()
                        : null,
                PoliticaPuntos.categoria(publicacion.getLibro()),
                publicacion.getLibro() != null ? publicacion.getLibro().getPaginas() : null
        );
    }
}
