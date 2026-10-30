package com.ingenieriaSoftware2.Mapper;

import com.ingenieriaSoftware2.DTO.Response.PublicacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Publicacion;
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

        return new PublicacionResponseDTO(
                publicacionId,
                titulo,
                autor,
                portadaUrl,
                publicacion.getEstadoFisico(),
                publicacion.getValorPuntosSolicitado(),
                publicacion.getValorReferenciaCalculado(),
                publicacion.getColorSemaforo(),
                publicacion.getComentario()
        );
    }
}
