// ==============================================================================
// MERCADOLIBRO - SERVICIO DE LIBROS Y CATÁLOGO (SPRING BOOT + GOOGLE BOOKS)
// ==============================================================================

import { apiFetch } from "./client"
import type {
  Libro,
  LibroRequestDTO,
  LibroResponseDTO,
  GoogleBookVolumeDTO,
  SpringPage,
  EstadoFisico,
  CategoriaLibro,
} from "../mercado-types"

/**
 * Cache en memoria para portadas y metadatos de Google Books por ISBN
 */
const googleBooksCache = new Map<string, GoogleBookVolumeDTO>()

/**
 * Convierte un DTO del backend en la entidad Libro utilizada en la interfaz,
 * enriqueciendo con portada y datos de Google Books si están disponibles.
 */
export function dtoToLibro(dto: any, googleData?: GoogleBookVolumeDTO | null): Libro {
  const gb = googleData || (dto.isbn ? googleBooksCache.get(dto.isbn) : undefined)
  const id = dto.id || dto.isbn || `libro-${Math.random().toString(36).slice(2)}`
  const autor = dto.autor || dto.autores || gb?.autor || "Autor desconocido"
  const categoriasRaw = dto.categoria || dto.categorias || gb?.categorias || []
  const categorias = Array.isArray(categoriasRaw) ? categoriasRaw : [categoriasRaw]
  const ratingExterno = dto.puntuacionExterna != null ? Number(dto.puntuacionExterna) : (gb?.ratingExterno || 4.5)

  return {
    id,
    isbn: dto.isbn || "",
    titulo: dto.titulo || "Sin título",
    autor,
    categoria: categorias,
    estadoFisico: dto.estadoFisico || "BUENO",
    valorReferencia: dto.valorReferencia || 10,
    disponible: dto.disponible ?? true,
    propietarioId: dto.propietario || "",
    propietarioNombre: dto.propietario ? `Usuario (${dto.propietario.slice(0, 6)})` : "Propietario",
    propietarioRating: 5.0,
    portadaUrl:
      gb?.portadaUrl ||
      `https://covers.openlibrary.org/b/isbn/${dto.isbn}-M.jpg?default=false`,
    descripcion: gb?.descripcion || "Sin descripción disponible.",
    editorial: gb?.editorial,
    anioPublicacion: gb?.anioPublicacion,
    ratingExterno,

    // Aliases retrocompatibles
    title: dto.titulo || "Sin título",
    author: autor,
    points: dto.valorReferencia || 10,
    condition: dto.estadoFisico || "BUENO",
    category: (categorias && categorias[0]) || "Otros",
    availability: (dto.disponible ?? true) ? "DISPONIBLE" : "INTERCAMBIADO",
    ownerId: dto.propietario || "owner",
    ownerName: dto.propietario ? `Usuario (${dto.propietario.slice(0, 6)})` : "Propietario",
    ownerRating: 5.0,
    ownerTrades: 0,
    coverUrl:
      gb?.portadaUrl ||
      `https://covers.openlibrary.org/b/isbn/${dto.isbn}-M.jpg?default=false`,
    description: gb?.descripcion || "Sin descripción disponible.",
    externalRating: ratingExterno,
  }
}

export const libroService = {
  /**
   * Obtiene la lista de libros disponibles para el catálogo público
   */
  async obtenerCatalogo(page = 0, size = 20): Promise<{ libros: Libro[]; total: number }> {
    try {
      const response = await apiFetch<any>(
        `/api/libro/catalogo?page=${page}&size=${size}`
      )
      const list = Array.isArray(response) ? response : (response?.content || [])
      const total = Array.isArray(response) ? response.length : (response?.totalElements ?? list.length)
      const libros = list.map((dto: any) => dtoToLibro(dto))
      return { libros, total }
    } catch {
      // Fallback a /api/libro si el endpoint difiere
      const response = await apiFetch<any>(
        `/api/libro?page=${page}&size=${size}`
      )
      const list = Array.isArray(response) ? response : (response?.content || [])
      const total = Array.isArray(response) ? response.length : (response?.totalElements ?? list.length)
      const libros = list.map((dto: any) => dtoToLibro(dto))
      return { libros, total }
    }
  },

  /**
   * Obtiene el detalle de un libro por su ID
   */
  async obtenerLibroPorId(id: string): Promise<Libro> {
    const dto = await apiFetch<LibroResponseDTO>(`/api/libro/${id}`)
    let gbData: GoogleBookVolumeDTO | null = null
    if (dto.isbn) {
      try {
        gbData = await this.buscarGoogleBooksPorIsbn(dto.isbn)
      } catch {
        // Continuar si falla la consulta a Google Books
      }
    }
    return dtoToLibro(dto, gbData)
  },

  /**
   * Busca libros aplicando filtros opcionales
   */
  async buscarLibros(params: {
    query?: string
    categoria?: CategoriaLibro | string
    estado?: EstadoFisico
    precioMin?: number
    precioMax?: number
    page?: number
    size?: number
  }): Promise<{ libros: Libro[]; total: number }> {
    const searchParams = new URLSearchParams()
    if (params.query) searchParams.set("query", params.query)
    if (params.categoria && params.categoria !== "TODAS") searchParams.set("categoria", params.categoria)
    if (params.estado) searchParams.set("estado", params.estado)
    if (params.precioMin !== undefined) searchParams.set("precioMin", params.precioMin.toString())
    if (params.precioMax !== undefined) searchParams.set("precioMax", params.precioMax.toString())
    searchParams.set("page", (params.page ?? 0).toString())
    searchParams.set("size", (params.size ?? 20).toString())

    const response = await apiFetch<SpringPage<LibroResponseDTO>>(
      `/api/libro/buscar?${searchParams.toString()}`
    )
    const libros = (response.content || []).map((dto) => dtoToLibro(dto))
    return { libros, total: response.totalElements }
  },

  /**
   * Obtiene los libros publicados por el usuario actualmente autenticado
   */
  async obtenerMisLibros(): Promise<Libro[]> {
    const response = await apiFetch<LibroResponseDTO[]>("/api/libro/mis-libros")
    return (response || []).map((dto) => dtoToLibro(dto))
  },

  /**
   * Publica un nuevo libro en el catálogo
   */
  async publicarLibro(data: LibroRequestDTO): Promise<Libro> {
    const response = await apiFetch<LibroResponseDTO>("/api/libro/publicar", {
      method: "POST",
      body: JSON.stringify(data),
    })

    let gbData: GoogleBookVolumeDTO | null = null
    if (data.isbn) {
      gbData = googleBooksCache.get(data.isbn) || null
    }

    return dtoToLibro(response, gbData)
  },

  /**
   * Actualiza los datos de un libro
   */
  async actualizarLibro(id: string, data: LibroRequestDTO): Promise<Libro> {
    const response = await apiFetch<LibroResponseDTO>(`/api/libro/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
    return dtoToLibro(response)
  },

  /**
   * Elimina una publicación de libro
   */
  async eliminarLibro(id: string): Promise<void> {
    await apiFetch<void>(`/api/libro/${id}`, {
      method: "DELETE",
    })
  },

  /**
   * Consulta los datos del libro en Google Books a través de Spring Boot
   */
  async buscarGoogleBooksPorIsbn(isbn: string): Promise<GoogleBookVolumeDTO | null> {
    const cleanIsbn = isbn.replace(/[-\s]/g, "")
    if (googleBooksCache.has(cleanIsbn)) {
      return googleBooksCache.get(cleanIsbn)!
    }

    try {
      const data = await apiFetch<GoogleBookVolumeDTO>(
        `/api/libro/google-books/isbn/${encodeURIComponent(cleanIsbn)}`
      )
      if (data) {
        googleBooksCache.set(cleanIsbn, data)
        return data
      }
    } catch {
      // Si el endpoint de Spring Boot no encuentra o falla, intentar consulta directa a Google Books
      try {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`)
        if (res.ok) {
          const json = await res.json()
          if (json.items && json.items.length > 0) {
            const vol = json.items[0].volumeInfo
            const gb: GoogleBookVolumeDTO = {
              isbn: cleanIsbn,
              titulo: vol.title || "",
              autor: vol.authors ? vol.authors.join(", ") : "",
              descripcion: vol.description || "",
              portadaUrl: vol.imageLinks?.thumbnail || vol.imageLinks?.smallThumbnail || "",
              editorial: vol.publisher || "",
              anioPublicacion: vol.publishedDate || "",
              categorias: vol.categories || [],
              paginas: vol.pageCount || 0,
              ratingExterno: vol.averageRating || 4.5,
            }
            googleBooksCache.set(cleanIsbn, gb)
            return gb
          }
        }
      } catch {
        // Ignorar
      }
    }
    return null
  },
}
