package com.ingenieriaSoftware2.DTO.External;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GoogleBooksSearchResponseDTO(
        Integer totalItems,
        List<GoogleBookItemDTO> items
) {}
