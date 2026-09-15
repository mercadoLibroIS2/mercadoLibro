import { apiClient } from "./client"
import type { LibroRequestDTO, LibroResponseDTO } from "./types"

export const bookService = {
  /**
   * Publica un libro en Spring Boot (POST /api/libro/publicar)
   * Requiere token JWT en la cabecera Authorization
   */
  async publicarLibro(libro: LibroRequestDTO): Promise<LibroResponseDTO> {
    return apiClient<LibroResponseDTO>("/libro/publicar", {
      method: "POST",
      requiresAuth: true,
      body: libro,
    })
  },

  /**
   * Intenta obtener la lista de libros disponibles desde Spring Boot (GET /api/libro/disponibles o GET /api/libro)
   * Soporta respuestas tanto en formato List<LibroResponseDTO> como Page<LibroResponseDTO> de Spring Data
   */
  async obtenerLibrosDisponibles(): Promise<LibroResponseDTO[]> {
    try {
      const res = await apiClient<unknown>("/libro/disponibles", {
        method: "GET",
      })
      if (Array.isArray(res)) return res
      if (typeof res === "object" && res !== null && "content" in res && Array.isArray((res as Record<string, unknown>).content)) {
        return (res as { content: LibroResponseDTO[] }).content
      }
      return []
    } catch {
      return []
    }
  },
}
