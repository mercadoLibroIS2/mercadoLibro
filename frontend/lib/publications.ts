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
