import { apiClient } from "./client"
import type { ReseniaControllerDTO, ReseniaResponseDTO } from "./types"

export const reviewService = {
  /**
   * Crea una reseña automática y suma 50 puntos al usuario (POST /api/resenia/auto)
   * Requiere token JWT en la cabecera Authorization
   */
  async crearReseniaAuto(resenia: ReseniaControllerDTO): Promise<ReseniaResponseDTO> {
    return apiClient<ReseniaResponseDTO>("/resenia/auto", {
      method: "POST",
      requiresAuth: true,
      body: resenia,
    })
  },
}
