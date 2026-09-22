package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Response.ReseniaResponseDTO;
import com.ingenieriaSoftware2.Entity.Resenia;

import java.time.LocalDate;
import java.util.UUID;

public interface ReseniaService {
    ReseniaResponseDTO crearResenia(UUID autorId, UUID calificadoId, UUID intercambioId, float calificacion, String comentario, LocalDate fecha);

}
