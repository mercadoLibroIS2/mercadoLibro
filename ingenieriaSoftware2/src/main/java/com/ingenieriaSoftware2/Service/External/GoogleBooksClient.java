package com.ingenieriaSoftware2.Service.External;

import com.ingenieriaSoftware2.DTO.External.GoogleBookItemDTO;
import com.ingenieriaSoftware2.DTO.External.GoogleBooksSearchResponseDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Component
public class GoogleBooksClient {

    private static final Logger log = LoggerFactory.getLogger(GoogleBooksClient.class);

    private final RestClient restClient;
    private final String apiUrl;
    private final String apiKey;

    public GoogleBooksClient(
            @Value("${google.books.api.url:https://www.googleapis.com/books/v1}") String apiUrl,
            @Value("${google.books.api.key:}") String apiKey
    ) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.restClient = RestClient.builder()
                .baseUrl(this.apiUrl)
                .build();
    }

    public Optional<GoogleBookItemDTO> buscarPorIsbn(String isbn) {
        if (isbn == null || isbn.isBlank()) {
            return Optional.empty();
        }
        String cleanIsbn = isbn.replaceAll("[^0-9X]", "");
        String query = "isbn:" + cleanIsbn;

        List<GoogleBookItemDTO> items = ejecutarBusqueda(query, 1);
        if (items.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(items.get(0));
    }

    public List<GoogleBookItemDTO> buscarPorTexto(String consulta, int limite) {
        if (consulta == null || consulta.isBlank()) {
            return Collections.emptyList();
        }
        int max = Math.min(Math.max(limite, 1), 40);
        return ejecutarBusqueda(consulta.trim(), max);
    }

    public Optional<GoogleBookItemDTO> obtenerPorVolumeId(String volumeId) {
        if (volumeId == null || volumeId.isBlank()) {
            return Optional.empty();
        }

        try {
            UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromPath("/volumes/{id}");
            if (!apiKey.isEmpty()) {
                uriBuilder.queryParam("key", apiKey);
            }

            GoogleBookItemDTO item = restClient.get()
                    .uri(uriBuilder.buildAndExpand(volumeId).toUriString())
                    .retrieve()
                    .body(GoogleBookItemDTO.class);

            return Optional.ofNullable(item);
        } catch (RestClientResponseException e) {
            log.warn("Error consultando Google Books para volumeId {}: HTTP {} - {}",
                    volumeId, e.getStatusCode(), e.getResponseBodyAsString());
            return Optional.empty();
        } catch (Exception e) {
            log.error("Excepción inesperada al consultar Google Books para volumeId {}: {}", volumeId, e.getMessage());
            return Optional.empty();
        }
    }

    private List<GoogleBookItemDTO> ejecutarBusqueda(String query, int maxResults) {
        int maxRetries = 2;
        long backoffMs = 500;

        for (int intento = 1; intento <= maxRetries; intento++) {
            try {
                UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromPath("/volumes")
                        .queryParam("q", query)
                        .queryParam("maxResults", maxResults);

                if (!apiKey.isEmpty()) {
                    uriBuilder.queryParam("key", apiKey);
                }

                GoogleBooksSearchResponseDTO response = restClient.get()
                        .uri(uriBuilder.build().toUriString())
                        .retrieve()
                        .body(GoogleBooksSearchResponseDTO.class);

                if (response != null && response.items() != null) {
                    return response.items();
                }
                return Collections.emptyList();
            } catch (RestClientResponseException e) {
                log.warn("Intento {}/{} - Error de Google Books (HTTP {}): {}",
                        intento, maxRetries, e.getStatusCode(), e.getMessage());
                if (intento < maxRetries && e.getStatusCode().value() == 503) {
                    try {
                        Thread.sleep(backoffMs * intento);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            } catch (Exception e) {
                log.error("Error al ejecutar búsqueda contra Google Books para '{}': {}", query, e.getMessage());
                break;
            }
        }
        return Collections.emptyList();
    }
}
