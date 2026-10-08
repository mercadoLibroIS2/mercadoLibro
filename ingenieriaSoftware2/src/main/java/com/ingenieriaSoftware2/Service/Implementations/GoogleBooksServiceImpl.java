package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Response.GoogleBookVolumeDTO;
import com.ingenieriaSoftware2.Service.Interfaces.GoogleBooksService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
public class GoogleBooksServiceImpl implements GoogleBooksService {

    private final RestClient restClient;

    public GoogleBooksServiceImpl() {
        this.restClient = RestClient.builder()
                .baseUrl("https://www.googleapis.com/books/v1")
                .build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public Optional<GoogleBookVolumeDTO> buscarPorIsbn(String isbn) {
        if (isbn == null || isbn.trim().isEmpty()) {
            return Optional.empty();
        }
        String cleanIsbn = isbn.replaceAll("[^0-9X]", "");
        try {
            String url = "/volumes?q=isbn:" + cleanIsbn;
            Map<String, Object> response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("items")) {
                List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
                if (items != null && !items.isEmpty()) {
                    Map<String, Object> volumeInfo = (Map<String, Object>) items.get(0).get("volumeInfo");
                    if (volumeInfo != null) {
                        return Optional.of(parseVolumeInfo(volumeInfo, cleanIsbn));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error al consultar Google Books para ISBN {}: {}", isbn, e.getMessage());
        }
        return Optional.empty();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<GoogleBookVolumeDTO> buscarPorTexto(String query, int limite) {
        List<GoogleBookVolumeDTO> resultados = new ArrayList<>();
        if (query == null || query.trim().isEmpty()) {
            return resultados;
        }

        try {
            int maxResults = Math.min(Math.max(limite, 1), 20);
            String encodedQuery = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8);
            String url = "/volumes?q=" + encodedQuery + "&maxResults=" + maxResults;

            Map<String, Object> response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("items")) {
                List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
                if (items != null) {
                    for (Map<String, Object> item : items) {
                        Map<String, Object> volumeInfo = (Map<String, Object>) item.get("volumeInfo");
                        if (volumeInfo != null) {
                            resultados.add(parseVolumeInfo(volumeInfo, null));
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error al buscar en Google Books con consulta {}: {}", query, e.getMessage());
        }

        return resultados;
    }

    @SuppressWarnings("unchecked")
    private GoogleBookVolumeDTO parseVolumeInfo(Map<String, Object> volumeInfo, String fallbackIsbn) {
        String titulo = (String) volumeInfo.getOrDefault("title", "");
        if (volumeInfo.containsKey("subtitle") && volumeInfo.get("subtitle") != null) {
            titulo += ": " + volumeInfo.get("subtitle");
        }

        List<String> authorsList = new ArrayList<>();
        Object authorsObj = volumeInfo.get("authors");
        if (authorsObj instanceof List<?>) {
            for (Object a : (List<?>) authorsObj) {
                if (a != null) authorsList.add(a.toString());
            }
        }
        String autor = String.join(", ", authorsList);

        String isbn = fallbackIsbn;
        Object identifiersObj = volumeInfo.get("industryIdentifiers");
        if (identifiersObj instanceof List<?>) {
            for (Object idObj : (List<?>) identifiersObj) {
                if (idObj instanceof Map<?, ?> idMap) {
                    String type = (String) idMap.get("type");
                    String idValue = (String) idMap.get("identifier");
                    if ("ISBN_13".equalsIgnoreCase(type)) {
                        isbn = idValue;
                        break;
                    } else if ("ISBN_10".equalsIgnoreCase(type) && (isbn == null || fallbackIsbn == null)) {
                        isbn = idValue;
                    }
                }
            }
        }

        String descripcion = (String) volumeInfo.getOrDefault("description", "");
        String editorial = (String) volumeInfo.getOrDefault("publisher", "");
        String anioPublicacion = (String) volumeInfo.getOrDefault("publishedDate", "");

        Integer paginas = null;
        Object pageCount = volumeInfo.get("pageCount");
        if (pageCount instanceof Number) {
            paginas = ((Number) pageCount).intValue();
        }

        Double rating = null;
        Object avgRating = volumeInfo.get("averageRating");
        if (avgRating instanceof Number) {
            rating = ((Number) avgRating).doubleValue();
        }

        String portadaUrl = null;
        Object imageLinksObj = volumeInfo.get("imageLinks");
        if (imageLinksObj instanceof Map<?, ?> imageMap) {
            if (imageMap.containsKey("thumbnail") && imageMap.get("thumbnail") != null) {
                portadaUrl = imageMap.get("thumbnail").toString();
            } else if (imageMap.containsKey("smallThumbnail") && imageMap.get("smallThumbnail") != null) {
                portadaUrl = imageMap.get("smallThumbnail").toString();
            }
            if (portadaUrl != null && portadaUrl.startsWith("http://")) {
                portadaUrl = "https://" + portadaUrl.substring(7);
            }
        }

        List<String> categorias = new ArrayList<>();
        Object catObj = volumeInfo.get("categories");
        if (catObj instanceof List<?>) {
            for (Object c : (List<?>) catObj) {
                if (c != null) categorias.add(c.toString());
            }
        }

        return new GoogleBookVolumeDTO(
                isbn != null ? isbn : "",
                titulo,
                autor,
                descripcion,
                portadaUrl,
                editorial,
                anioPublicacion,
                categorias,
                paginas,
                rating
        );
    }
}
