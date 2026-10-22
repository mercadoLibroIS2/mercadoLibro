package com.ingenieriaSoftware2.DTO.External;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GoogleBookItemDTO(
        String id,
        VolumeInfo volumeInfo
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VolumeInfo(
            String title,
            List<String> authors,
            String description,
            List<String> categories,
            BigDecimal averageRating,
            Integer ratingsCount,
            ImageLinks imageLinks,
            List<IndustryIdentifier> industryIdentifiers
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ImageLinks(
            String thumbnail,
            String smallThumbnail
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record IndustryIdentifier(
            String type,
            String identifier
    ) {}
}
