package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Response.GoogleBookVolumeDTO;
import com.ingenieriaSoftware2.Service.Interfaces.GoogleBooksService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
public class GoogleBooksServiceImpl implements GoogleBooksService {

    private final RestClient restClient;
    private final String apiKey;

    public GoogleBooksServiceImpl() {
        this("https://www.googleapis.com/books/v1", System.getenv().getOrDefault("GOOGLE_BOOKS_API_KEY", ""));
    }

    public GoogleBooksServiceImpl(
            @Value("${google.books.api.url:https://www.googleapis.com/books/v1}") String baseUrl,
            @Value("${google.books.api.key:}") String apiKey
    ) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl != null && !baseUrl.isBlank() ? baseUrl : "https://www.googleapis.com/books/v1")
                .build();
    }

    @Override
    public Optional<GoogleBookVolumeDTO> buscarPorIsbn(String isbn) {
        String cleanIsbn = normalizeIsbn(isbn);
        if (cleanIsbn.isEmpty()) {
            return Optional.empty();
        }

        try {
            Map<String, Object> response = getVolumesConReintentos("isbn:" + cleanIsbn, 1);
            List<Map<String, Object>> items = items(response);
            if (!items.isEmpty()) {
                return Optional.of(toDto(items.get(0), cleanIsbn));
            }

            // Fallback 1: búsqueda directa por ISBN sin prefijo si "isbn:" no arrojó resultados
            Map<String, Object> fallbackResponse = getVolumesConReintentos(cleanIsbn, 1);
            List<Map<String, Object>> fallbackItems = items(fallbackResponse);
            if (!fallbackItems.isEmpty()) {
                return Optional.of(toDto(fallbackItems.get(0), cleanIsbn));
            }
        } catch (Exception exception) {
            log.warn("Consulta search de Google Books falló para ISBN {}: {}", cleanIsbn, exception.getMessage());
        }

        // Fallback 2 (Resiliente a 503): resolver ID directo de Google Books y consultar volumen por ID con API Key
        try {
            String volumeId = resolverVolumeIdPorViewApi(cleanIsbn);
            if (volumeId != null && !volumeId.isBlank()) {
                Map<String, Object> item = getVolumeById(volumeId);
                if (item != null && !item.isEmpty()) {
                    log.info("Libro resuelto exitosamente vía volumeId ({}) para ISBN {}", volumeId, cleanIsbn);
                    return Optional.of(toDto(item, cleanIsbn));
                }
            }
        } catch (Exception exception) {
            log.warn("Consulta por volumeId falló para ISBN {}: {}", cleanIsbn, exception.getMessage());
        }

        return Optional.empty();
    }

    private String resolverVolumeIdPorViewApi(String isbn) {
        try {
            String url = "https://books.google.com/books?jscmd=viewapi&bibkeys=ISBN:" + isbn;
            String body = RestClient.create().get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);
            if (body != null) {
                java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("id=([a-zA-Z0-9_-]+)").matcher(body);
                if (matcher.find()) {
                    return matcher.group(1);
                }
            }
        } catch (Exception ex) {
            log.debug("No se pudo resolver ID desde ViewAPI para ISBN {}: {}", isbn, ex.getMessage());
        }
        return null;
    }

    private Map<String, Object> getVolumeById(String volumeId) {
        return restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder.path("/volumes/{id}");
                    if (apiKey != null && !apiKey.isBlank()) {
                        builder.queryParam("key", apiKey);
                    }
                    return builder.build(volumeId);
                })
                .retrieve()
                .body(Map.class);
    }

    @Override
    public List<GoogleBookVolumeDTO> buscarPorTexto(String query, int limite) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        try {
            int maxResults = Math.min(Math.max(limite, 1), 20);
            List<Map<String, Object>> items = items(getVolumesConReintentos(query.trim(), maxResults));
            List<GoogleBookVolumeDTO> results = new ArrayList<>();
            for (Map<String, Object> item : items) {
                results.add(toDto(item, null));
            }
            return results;
        } catch (Exception exception) {
            log.warn("No se pudo buscar '{}' en Google Books: {}", query, exception.getMessage());
            return List.of();
        }
    }

    private Map<String, Object> getVolumesConReintentos(String query, int maxResults) {
        int maxRetries = 3;
        long backoffMs = 500;

        for (int intento = 1; intento <= maxRetries; intento++) {
            try {
                return getVolumes(query, maxResults);
            } catch (HttpStatusCodeException ex) {
                if (intento < maxRetries && ex.getStatusCode().value() == 503) {
                    log.warn("Google Books 503 (backendFailed) en intento {}/{}. Reintentando...", intento, maxRetries);
                    dormir(backoffMs * intento);
                    continue;
                }
                throw ex;
            } catch (Exception ex) {
                if (intento < maxRetries && ex.getMessage() != null && ex.getMessage().contains("503")) {
                    log.warn("Error 503 en intento {}/{}. Reintentando...", intento, maxRetries);
                    dormir(backoffMs * intento);
                    continue;
                }
                throw ex;
            }
        }
        return Map.of();
    }

    private void dormir(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private Map<String, Object> getVolumes(String query, int maxResults) {
        return restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder
                            .path("/volumes")
                            .queryParam("q", query)
                            .queryParam("maxResults", maxResults);
                    if (apiKey != null && !apiKey.isBlank()) {
                        builder.queryParam("key", apiKey);
                    }
                    return builder.build();
                })
                .retrieve()
                .body(Map.class);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> items(Map<String, Object> response) {
        if (response == null || !(response.get("items") instanceof List<?> rawItems)) {
            return List.of();
        }
        return (List<Map<String, Object>>) rawItems;
    }

    @SuppressWarnings("unchecked")
    private GoogleBookVolumeDTO toDto(Map<String, Object> item, String fallbackIsbn) {
        Map<String, Object> info = item.get("volumeInfo") instanceof Map<?, ?> volumeInfo
                ? (Map<String, Object>) volumeInfo
                : Map.of();

        String isbn = fallbackIsbn;
        if (info.get("industryIdentifiers") instanceof List<?> identifiers) {
            for (Object identifier : identifiers) {
                if (identifier instanceof Map<?, ?> value) {
                    String type = String.valueOf(value.get("type"));
                    String candidate = String.valueOf(value.get("identifier"));
                    if ("ISBN_13".equals(type)) {
                        isbn = candidate;
                        break;
                    }
                    if (isbn == null && "ISBN_10".equals(type)) {
                        isbn = candidate;
                    }
                }
            }
        }

        List<String> authors = strings(info.get("authors"));
        List<String> categories = strings(info.get("categories"));
        String title = string(info.get("title"));
        String subtitle = string(info.get("subtitle"));
        if (!subtitle.isBlank()) {
            title += ": " + subtitle;
        }

        String cover = "";
        if (info.get("imageLinks") instanceof Map<?, ?> imageLinks) {
            Object thumbnail = imageLinks.get("thumbnail");
            Object smallThumbnail = imageLinks.get("smallThumbnail");
            cover = thumbnail != null ? thumbnail.toString() : smallThumbnail != null ? smallThumbnail.toString() : "";
            if (cover.startsWith("http://")) {
                cover = "https://" + cover.substring(7);
            }
        }

        return new GoogleBookVolumeDTO(
                item.get("id") == null ? "" : item.get("id").toString(),
                isbn == null ? "" : isbn,
                title,
                String.join(", ", authors),
                string(info.get("description")),
                cover,
                string(info.get("publisher")),
                string(info.get("publishedDate")),
                categories,
                number(info.get("pageCount")),
                decimal(info.get("averageRating"))
        );
    }

    private String normalizeIsbn(String isbn) {
        return isbn == null ? "" : isbn.replaceAll("[^0-9Xx]", "").toUpperCase();
    }

    private String string(Object value) {
        return value == null ? "" : value.toString();
    }

    private List<String> strings(Object value) {
        if (!(value instanceof List<?> values)) {
            return List.of();
        }
        return values.stream().filter(item -> item != null).map(Object::toString).toList();
    }

    private Integer number(Object value) {
        return value instanceof Number number ? number.intValue() : null;
    }

    private Double decimal(Object value) {
        return value instanceof Number number ? number.doubleValue() : null;
    }
}
