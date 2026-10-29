import type { GoogleBookVolume } from "./mercado-types"

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8086"

export async function findGoogleBookByIsbn(isbn: string): Promise<GoogleBookVolume | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "")
  if (!cleanIsbn) return null

  try {
    const response = await fetch(
      `${backendUrl}/api/libro/google-books/isbn/${encodeURIComponent(cleanIsbn)}`,
    )
    if (response.ok) return (await response.json()) as GoogleBookVolume
    if (response.status !== 404) {
      console.warn(`[Google Books] El backend respondió HTTP ${response.status}; se usa Open Library.`)
    }
  } catch (error) {
    console.warn("[Google Books] Backend no disponible; se usa Open Library.", error)
  }

  // El backend devuelve 404 también cuando Google Books agota su cuota diaria (429),
  // así que se intenta con Open Library antes de dar el libro por inexistente.
  return findOpenLibraryBookByIsbn(cleanIsbn)
}

interface OpenLibraryBook {
  key?: string
  title?: string
  authors?: { name: string }[]
  publishers?: { name: string }[]
  publish_date?: string
  number_of_pages?: number
  subjects?: { name: string }[]
  cover?: { medium?: string; large?: string }
}

async function findOpenLibraryBookByIsbn(isbn: string): Promise<GoogleBookVolume | null> {
  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  )
  if (!response.ok) {
    throw new Error(`No se pudo consultar el catálogo de libros (HTTP ${response.status}).`)
  }
  const data = (await response.json()) as Record<string, OpenLibraryBook>
  const book = data[`ISBN:${isbn}`]
  if (!book?.title) return null

  return {
    googleBooksId: "",
    isbn,
    titulo: book.title,
    autor: (book.authors || []).map((author) => author.name).join(", "),
    descripcion: "",
    portadaUrl: book.cover?.medium || book.cover?.large || "",
    editorial: (book.publishers || []).map((publisher) => publisher.name).join(", "),
    anioPublicacion: book.publish_date || "",
    categorias: (book.subjects || []).slice(0, 3).map((subject) => subject.name),
    paginas: book.number_of_pages ?? null,
    ratingExterno: null,
  }
}
