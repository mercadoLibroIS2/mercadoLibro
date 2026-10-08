// ==============================================================================
// MERCADOLIBRO - SERVICIO DE RESEÑAS (SPRING BOOT)
// ==============================================================================

import { apiFetch } from "./client"
import type {
  Resenia,
  ReseniaControllerDTO,
  ReseniaResponseDTO,
} from "../mercado-types"

export const reseniaService = {
  /**
   * Crea una reseña y calificación tras completar un intercambio
   */
  async crearResenia(data: ReseniaControllerDTO): Promise<Resenia> {
    const response = await apiFetch<ReseniaResponseDTO>("/api/resenia/auto", {
      method: "POST",
      body: JSON.stringify(data),
    })

    return {
      id: response.id,
      autorId: response.autorId,
      calificadoId: response.calificadoId,
      intercambioId: response.intercambioId,
      calificacion: response.calificacion,
      comentario: response.comentario,
      fecha: response.fecha,
      // Aliases
      tradeId: response.intercambioId,
      fromUserId: response.autorId,
      fromUserName: "Usuario",
      toUserId: response.calificadoId,
      rating: response.calificacion,
      comment: response.comentario,
      date: response.fecha,
      bookTitle: "Libro",
    }
  },
}
