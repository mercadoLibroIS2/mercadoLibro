package com.ingenieriaSoftware2.Service.Interfaces;

import com.ingenieriaSoftware2.DTO.Response.ReseniaResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.IntercambioId;

import java.time.LocalDate;
import java.util.UUID;

public interface ReseniaService {
    ReseniaResponseDTO crearResenia(String autorEmail, String calificadoEmail, IntercambioId intercambioId, float calificacion, String comentario, LocalDate fecha);

}
