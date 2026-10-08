package com.ingenieriaSoftware2.DTO.Response;

import java.util.List;

public record GoogleBookVolumeDTO(
        String isbn,
        String titulo,
        String autor,
        String descripcion,
        String portadaUrl,
        String editorial,
        String anioPublicacion,
        List<String> categorias,
        Integer paginas,
        Double ratingExterno
) {
}
