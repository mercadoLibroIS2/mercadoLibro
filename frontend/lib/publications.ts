import { supabase } from "./supabase"

export type PublicationState = "DISPONIBLE" | "RESERVADA"
export type BookCondition = "NUEVO" | "COMO_NUEVO" | "BUENO" | "ACEPTABLE" | "MALO"
const BOOK_CONDITIONS: BookCondition[] = ["NUEVO", "COMO_NUEVO", "BUENO", "ACEPTABLE", "MALO"]

export interface CachedBook {
  isbn: string
  google_books_id: string
  titulo: string
  autores: string | null
  puntuacion_externa: number | null
}

export interface Publication {
  isbn: string
  email_propietario_id: string
  hora_de_publicacion: string
  estado_fisico: BookCondition
  valor_puntos_solicitado: number
  valor_referencia_calculado: number | null
  comentario: string | null
  estado: PublicationState
  color_semaforo: string
  book: CachedBook | null
}

export interface PublicationKey {
  isbn: string
  email_propietario_id: string
  hora_de_publicacion: string
}

export interface PublicationChanges {
  estado_fisico: BookCondition
  valor_puntos_solicitado: number
  comentario: string | null
}

export interface ManualBook {
  isbn: string
  titulo: string
  autores: string
}

function requireEmail(email: string | undefined): string {
  if (!email) {
    throw new Error("No se pudo identificar al usuario autenticado.")
  }

  return email.toLowerCase()
}

function validateChanges(changes: PublicationChanges): void {
  if (!BOOK_CONDITIONS.includes(changes.estado_fisico)) {
    throw new Error("Seleccioná un estado físico válido.")
  }
  if (!Number.isSafeInteger(changes.valor_puntos_solicitado) || changes.valor_puntos_solicitado < 0) {
    throw new Error("El valor en puntos debe ser un entero mayor o igual a cero.")
  }
}

function normalizeIsbn(isbn: string): string {
  const normalized = isbn.replace(/[\s-]/g, "").toUpperCase()
  const isIsbn10 = /^\d{9}[\dX]$/.test(normalized)
  const isIsbn13 = /^\d{13}$/.test(normalized)

  if (!isIsbn10 && !isIsbn13) {
    throw new Error("Ingresá un ISBN válido de 10 o 13 caracteres.")
  }

  if (isIsbn10) {
    const sum = [...normalized].reduce((total, digit, index) => {
      const value = digit === "X" ? 10 : Number(digit)
      return total + value * (10 - index)
    }, 0)
    if (sum % 11 !== 0) throw new Error("El ISBN-10 no es válido.")
  } else {
    const sum = [...normalized.slice(0, 12)].reduce(
      (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
      0
    )
    const checkDigit = (10 - (sum % 10)) % 10
    if (checkDigit !== Number(normalized[12])) throw new Error("El ISBN-13 no es válido.")
  }

  return normalized
}

async function getAuthenticatedEmail(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(`No se pudo validar la sesión: ${error.message}`)
  return requireEmail(data.user?.email)
}

export async function searchCachedBooks(query: string): Promise<CachedBook[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) return []

  const escapedQuery = normalizedQuery.replace(/[\\%_]/g, "\\$&")
  const { data, error } = await supabase
    .from("libro_metadata_cache")
    .select("isbn, google_books_id, titulo, autores, puntuacion_externa")
    .ilike("titulo", `%${escapedQuery}%`)
    .order("titulo")
    .limit(20)

  if (error) throw new Error(`No se pudieron buscar libros: ${error.message}`)
  return data ?? []
}

export async function listMyPublications(): Promise<Publication[]> {
  const email = await getAuthenticatedEmail()
  const { data, error } = await supabase
    .from("publicacion")
    .select(
      "isbn, email_propietario_id, hora_de_publicacion, estado_fisico, valor_puntos_solicitado, valor_referencia_calculado, comentario, estado, color_semaforo"
    )
    .eq("email_propietario_id", email)
    .in("estado", ["DISPONIBLE", "RESERVADA"])
    .order("hora_de_publicacion", { ascending: false })

  if (error) throw new Error(`No se pudieron cargar tus publicaciones: ${error.message}`)

  const rows = data ?? []
  const isbns = [...new Set(rows.map((row) => row.isbn))]
  let books: CachedBook[] = []

  if (isbns.length > 0) {
    const { data: cachedBooks, error: booksError } = await supabase
      .from("libro_metadata_cache")
      .select("isbn, google_books_id, titulo, autores, puntuacion_externa")
      .in("isbn", isbns)

    if (booksError) {
      throw new Error(`No se pudieron cargar los datos bibliográficos: ${booksError.message}`)
    }
    books = cachedBooks ?? []
  }

  const booksByIsbn = new Map(books.map((book) => [book.isbn, book]))
  return rows.map((row) => ({
    ...row,
    estado: row.estado as PublicationState,
    book: booksByIsbn.get(row.isbn) ?? null,
  }))
}

export async function createPublication(
  book: CachedBook,
  changes: PublicationChanges
): Promise<void> {
  validateChanges(changes)
  const email = await getAuthenticatedEmail()
  const { data: cachedBook, error: cacheError } = await supabase
    .from("libro_metadata_cache")
    .select("isbn")
    .eq("isbn", book.isbn)
    .maybeSingle()

  if (cacheError) {
    throw new Error(`No se pudo validar el libro seleccionado: ${cacheError.message}`)
  }
  if (!cachedBook) {
    throw new Error("El libro seleccionado ya no está disponible en el catálogo.")
  }

  const { error } = await supabase.from("publicacion").insert({
    isbn: book.isbn,
    email_propietario_id: email,
    estado_fisico: changes.estado_fisico,
    valor_puntos_solicitado: changes.valor_puntos_solicitado,
    comentario: changes.comentario,
  })

  if (error) throw new Error(`No se pudo publicar el libro: ${error.message}`)
}

export async function createManualPublication(
  book: ManualBook,
  changes: PublicationChanges
): Promise<CachedBook> {
  validateChanges(changes)
  const email = await getAuthenticatedEmail()
  const isbn = normalizeIsbn(book.isbn)
  const titulo = book.titulo.trim()
  const autores = book.autores.trim()
  if (!titulo) throw new Error("El título del libro es obligatorio.")
  if (!autores) throw new Error("El autor del libro es obligatorio.")

  const { data: existingBook, error: lookupError } = await supabase
    .from("libro_metadata_cache")
    .select("isbn, google_books_id, titulo, autores, puntuacion_externa")
    .eq("isbn", isbn)
    .maybeSingle()

  if (lookupError) throw new Error(`No se pudo validar el ISBN: ${lookupError.message}`)

  let cachedBook = existingBook
  if (!cachedBook) {
    const { data, error } = await supabase
      .from("libro_metadata_cache")
      .insert({
        isbn,
        google_books_id: `MANUAL:${isbn}`,
        titulo,
        autores,
      })
      .select("isbn, google_books_id, titulo, autores, puntuacion_externa")
      .single()

    if (error) throw new Error(`No se pudo guardar el libro manualmente: ${error.message}`)
    cachedBook = data
  }

  const { error: publicationError } = await supabase.from("publicacion").insert({
    isbn: cachedBook.isbn,
    email_propietario_id: email,
    estado_fisico: changes.estado_fisico,
    valor_puntos_solicitado: changes.valor_puntos_solicitado,
    comentario: changes.comentario,
  })

  if (publicationError) {
    throw new Error(`No se pudo publicar el libro: ${publicationError.message}`)
  }

  return cachedBook
}

async function updateAvailablePublication(
  key: PublicationKey,
  changes: Partial<PublicationChanges> & { estado?: "ELIMINADA" }
): Promise<void> {
  const email = await getAuthenticatedEmail()
  if (key.email_propietario_id.toLowerCase() !== email) {
    throw new Error("Solo puedes modificar tus propias publicaciones.")
  }

  const { data, error } = await supabase
    .from("publicacion")
    .update(changes)
    .eq("isbn", key.isbn)
    .eq("email_propietario_id", email)
    .eq("hora_de_publicacion", key.hora_de_publicacion)
    .eq("estado", "DISPONIBLE")
    .select("isbn")

  if (error) throw new Error(`No se pudo actualizar la publicación: ${error.message}`)
  if (!data?.length) {
    throw new Error("La publicación ya no está disponible para editar o eliminar.")
  }
}

export async function editPublication(
  key: PublicationKey,
  changes: PublicationChanges
): Promise<void> {
  validateChanges(changes)
  await updateAvailablePublication(key, changes)
}

export async function deletePublication(key: PublicationKey): Promise<void> {
  await updateAvailablePublication(key, { estado: "ELIMINADA" })
}
