package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Response.GoogleBookVolumeDTO;

import java.util.List;
import java.util.Optional;

public interface GoogleBooksService {
    Optional<GoogleBookVolumeDTO> buscarPorIsbn(String isbn);
    List<GoogleBookVolumeDTO> buscarPorTexto(String query, int limite);
}
