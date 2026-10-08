import { apiFetch } from "./client"
import type {
  PublicacionRequestDTO,
  PublicacionResponseDTO,
  Publicacion,
  Libro,
} from "../mercado-types"

export const publicacionService = {
  /**
   * Publicar un libro/ejemplar físico en la plataforma con cálculo de semáforo de precios.
   */
  async publicar(request: PublicacionRequestDTO): Promise<PublicacionResponseDTO | null> {
    try {
      return await apiFetch<PublicacionResponseDTO>("/api/publicacion/publicar", {
        method: "POST",
        body: JSON.stringify(request),
      })
    } catch (err) {
      console.warn("[PublicacionService] Falló publicar en backend:", err)
      return null
    }
  },

  /**
   * Listar todas las publicaciones disponibles para el catálogo general.
   */
  async obtenerCatalogo(): Promise<PublicacionResponseDTO[]> {
    try {
      const data = await apiFetch<PublicacionResponseDTO[]>("/api/publicacion/catalogo", {
        method: "GET",
      })
      return data || []
    } catch (err) {
      console.warn("[PublicacionService] Falló obtener catálogo de publicaciones:", err)
      return []
    }
  },

  /**
   * Obtener las publicaciones activas del usuario autenticado.
   */
  async obtenerMisPublicaciones(): Promise<PublicacionResponseDTO[]> {
    try {
      const data = await apiFetch<PublicacionResponseDTO[]>("/api/publicacion/mis-publicaciones", {
        method: "GET",
      })
      return data || []
    } catch (err) {
      console.warn("[PublicacionService] Falló obtener mis publicaciones:", err)
      return []
    }
  },

  /**
   * Ver detalle completo de una publicación por su clave compuesta.
   */
  async verDetalles(email: string, isbn: string, hora: string): Promise<PublicacionResponseDTO | null> {
    try {
      return await apiFetch<PublicacionResponseDTO>(
        `/api/publicacion/${encodeURIComponent(email)}/${encodeURIComponent(isbn)}/${encodeURIComponent(hora)}`,
        { method: "GET" }
      )
    } catch (err) {
      console.warn("[PublicacionService] Falló obtener detalle:", err)
      return null
    }
  },

  /**
   * Mapea un PublicacionResponseDTO a un Libro retrocompatible para las pantallas existentes del catálogo.
   */
  toLibro(dto: PublicacionResponseDTO): Libro {
    const pubId = dto.publicacionId
    const id = pubId ? `${pubId.isbn}-${pubId.emailPropietario}-${pubId.horaPublicacion || ""}` : `pub-${Date.now()}`
    const isbn = pubId?.isbn || ""
    const ownerEmail = pubId?.emailPropietario || "usuario@mercadolibro.test"
    const ownerName = ownerEmail.split("@")[0]

    return {
      id,
      isbn,
      titulo: dto.tituloLibro || `Libro ${isbn}`,
      autor: dto.autorLibro || "Autor desconocido",
      estadoFisico: dto.estadoFisico,
      valorReferencia: dto.valorReferenciaCalculado,
      disponible: dto.estadoPublicacion === "DISPONIBLE",
      propietarioId: ownerEmail,
      propietarioNombre: ownerName,
      propietarioRating: 5.0,
      propietarioIntercambios: 0,

      // Aliases para componentes visuales
      title: dto.tituloLibro || `Libro ${isbn}`,
      author: dto.autorLibro || "Autor desconocido",
      points: dto.valorPuntosSolicitado,
      condition: dto.estadoFisico,
      category: "OTROS",
      availability: dto.estadoPublicacion === "DISPONIBLE" ? "DISPONIBLE" : "RESERVADO",
      ownerId: ownerEmail,
      ownerName,
      ownerRating: 5.0,
      ownerTrades: 0,
      referencePrice: dto.valorReferenciaCalculado,
      edition: dto.comentario,
      portadaUrl: "/placeholder.svg",
    }
  },
}
