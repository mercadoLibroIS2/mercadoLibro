import type { Book, Category, Condition, GoogleBookVolume, User } from "./mercado-types"
import { CATEGORIES } from "./mercado-types"
import { calculateReferencePrice, evaluatePriceDeal } from "./price-evaluator"
import { selectUsuarios } from "./social-db"
import { supabase } from "./supabase"

type DatabaseRow = Record<string, unknown>

const CONDITION_TO_DATABASE: Record<Condition, string> = {
  Nuevo: "NUEVO",
  "Como nuevo": "COMO_NUEVO",
  "Muy bueno": "BUEN_ESTADO",
  Bueno: "BUEN_ESTADO",
  Aceptable: "ACEPTABLE",
  "Con marcas": "DETERIORADO",
}

const CONDITION_FROM_DATABASE: Record<string, Condition> = {
  NUEVO: "Nuevo",
  COMO_NUEVO: "Como nuevo",
  BUEN_ESTADO: "Muy bueno",
  ACEPTABLE: "Aceptable",
  DETERIORADO: "Con marcas",
}

function text(row: DatabaseRow, key: string, fallback = ""): string {
  const value = row[key]
  return typeof value === "string" ? value : fallback
}

function number(row: DatabaseRow, key: string, fallback = 0): number {
  const value = row[key]
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toBook(
  publication: DatabaseRow,
  book: DatabaseRow | undefined,
  owner: DatabaseRow | undefined,
  category: DatabaseRow | undefined,
  users: User[],
  currentUser: User,
): Book {
  const isbn = text(publication, "isbn")
  const email = text(publication, "email_propietario")
  const timestamp = text(publication, "hora_publicacion")
  const condition = CONDITION_FROM_DATABASE[text(publication, "estado_fisico")] || "Bueno"
  const databaseCategory = text(category || {}, "nombre_categoria")
  const selectedCategory = CATEGORIES.find((candidate) => candidate === databaseCategory) || "Sin categoría"
  const ownerName = text(owner || {}, "nombre_completo") || text(owner || {}, "nombre", email.split("@")[0])
  const knownUser = users.find((user) => user.email.toLowerCase() === email.toLowerCase())
  const isCurrentUser = currentUser.email.toLowerCase() === email.toLowerCase()
  const rating = number(owner || {}, "reputacion_promedio", 5)

  return {
    id: JSON.stringify([isbn, email, timestamp]),
    title: text(book || {}, "titulo", `Libro ${isbn}`),
    author: text(book || {}, "autores", "Autor no disponible"),
    isbn,
    category: selectedCategory,
    condition,
    points: number(publication, "valor_puntos_solicitado"),
    description: text(publication, "comentario") || undefined,
    coverUrl: coverUrlForIsbn(isbn),
    ownerId: isCurrentUser ? currentUser.id : knownUser?.id || text(owner || {}, "id") || email,
    ownerName: isCurrentUser ? currentUser.name : knownUser?.name || ownerName,
    ownerRating: rating,
    ownerTrades: knownUser?.totalTrades || number(owner || {}, "total_intercambios"),
    availability: ({
      DISPONIBLE: "DISPONIBLE",
      RESERVADA: "RESERVADO",
      VENDIDA: "INTERCAMBIADO",
      ELIMINADA: "ELIMINADO",
    }[text(publication, "estado_publicacion")] || "DISPONIBLE") as Book["availability"],
    referencePrice: number(publication, "valor_referencia_calculado")
      || calculateReferencePrice(selectedCategory, condition, externalRatingOf(book)),
    externalRating: externalRatingOf(book),
    createdAt: timestamp,
  }
}

// Rating de Google Books guardado en libro.puntuacion_externa; sin dato se usa un valor neutro.
export const DEFAULT_EXTERNAL_RATING = 4.0

function externalRatingOf(book: DatabaseRow | undefined): number {
  const rating = number(book || {}, "puntuacion_externa", 0)
  return rating > 0 ? rating : DEFAULT_EXTERNAL_RATING
}

/** Valor de referencia y color del semáforo que se guardan con la publicación. */
export function publicationPricing(
  points: number,
  category: string,
  condition: Condition,
  book: DatabaseRow | undefined,
): { valor_referencia_calculado: number; color_semaforo: "VERDE" | "AMARILLO" | "ROJO" } {
  const evaluation = evaluatePriceDeal(points, category, condition, externalRatingOf(book))
  return {
    valor_referencia_calculado: evaluation.referencePrice,
    color_semaforo: ({ green: "VERDE", yellow: "AMARILLO", red: "ROJO" } as const)[evaluation.deal],
  }
}

export function categoryFromRow(category: DatabaseRow | null | undefined): string {
  const databaseCategory = text(category || {}, "nombre_categoria")
  return CATEGORIES.find((candidate) => candidate === databaseCategory) || "Sin categoría"
}

// Palabras clave (Google Books / Open Library, en inglés o español) -> categoría del catálogo.
const CATEGORY_KEYWORDS: [Category, RegExp][] = [
  ["Comics y novela gráfica", /comic|graphic novel|manga|historieta|novela gr[aá]fica/i],
  ["Infantil", /juvenile|children|infantil|kids|picture book/i],
  ["Poesía", /poetry|poes[ií]a|poems|poemas/i],
  ["Filosofía", /philosoph|filosof/i],
  ["Biografía", /biograph|autobiograph|memoir|biograf/i],
  ["Historia", /history|historia|hist[oó]ric/i],
  ["Técnico", /computer|programming|engineering|technology|t[eé]cnic|inform[aá]tica|software/i],
  ["Ciencia", /science|ciencia|physics|biology|chemistry|mathemat|matem[aá]tic|astronom/i],
  ["Autoayuda", /self-help|autoayuda|personal growth|motivation|psicolog|psycholog/i],
  ["Ficción", /fiction|ficci[oó]n|novel|novela|fantasy|fantas[ií]a|thriller|mystery|romance|literatur/i],
  ["No ficción", /essay|ensayo|business|negocios|politic|economic|cooking|cocina|travel|viajes|education/i],
]

/** Sugiere una categoría del catálogo a partir de las categorías del servicio externo. */
export function suggestCategory(externalCategories: string[] | undefined): Category | undefined {
  const joined = (externalCategories || []).join(" | ")
  if (!joined.trim()) return undefined
  return CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(joined))?.[0]
}

/**
 * Asigna la categoría al libro (por ISBN) si todavía no tiene una.
 * Devuelve la categoría que quedó guardada, o null si la base no lo permite (migración sin aplicar).
 */
export async function assignBookCategory(isbn: string, category: Category): Promise<string | null> {
  const { data: existing, error: readError } = await supabase
    .from("libro_categoria")
    .select("nombre_categoria")
    .eq("isbn", isbn)
    .limit(1)
  if (readError) throw readError
  const current = (existing as DatabaseRow[] | null)?.[0]
  if (current) return text(current, "nombre_categoria")

  const { error } = await supabase.from("libro_categoria").insert({ isbn, nombre_categoria: category })
  if (error) {
    // 42501 = sin permiso (falta la migración); 23503 = la categoría no existe en la tabla categoria.
    if (["42501", "23503", "PGRST301"].includes((error as { code?: string }).code || "")) return null
    throw error
  }
  return category
}

// Portada pública de Open Library; devuelve 404 si no existe y la tarjeta muestra el placeholder.
function coverUrlForIsbn(isbn: string): string | undefined {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "")
  return cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg?default=false` : undefined
}

// Perfiles de la tabla usuario, identificados por el mismo UUID que Supabase Auth,
// para que notificaciones, reseñas y perfiles públicos apunten a la misma persona.
export async function loadDatabaseUsers(): Promise<User[]> {
  const rows = await selectUsuarios((columns) => supabase.from("usuario").select(columns))
  return rows
    .filter((row) => text(row, "id") && text(row, "email"))
    .map(databaseUser)
}

export function databaseUser(row: DatabaseRow): User {
  const email = text(row, "email")
  const username = text(row, "nombre", email.split("@")[0])
  const fullName = text(row, "nombre_completo")
  return {
    id: text(row, "id"),
    name: fullName || username.charAt(0).toUpperCase() + username.slice(1),
    username,
    email,
    avatar: text(row, "avatar_url") || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`,
    bio: text(row, "bio") || undefined,
    city: text(row, "ciudad") || undefined,
    rating: number(row, "reputacion_promedio", 5),
    totalReviews: number(row, "total_resenias"),
    totalTrades: number(row, "total_intercambios"),
    availablePoints: number(row, "saldo_total"),
    reservedPoints: number(row, "saldo_reservado"),
    joinedDate: text(row, "fecha_alta"),
    role: text(row, "rol") === "ADMINISTRADOR" ? "ADMINISTRADOR" : "USUARIO",
    active: row.es_activo !== false,
  }
}

export function databaseCondition(condition: Condition): string {
  return CONDITION_TO_DATABASE[condition]
}

export async function loadDatabasePublications(currentUser: User, users: User[]): Promise<Book[]> {
  const { data: publicationRows, error: publicationError } = await supabase
    .from("publicacion")
    .select("*")
    .neq("estado_publicacion", "ELIMINADA")
    .order("hora_publicacion", { ascending: false })

  if (publicationError) throw publicationError
  const publications = (publicationRows || []) as DatabaseRow[]
  if (publications.length === 0) return []

  const isbns = [...new Set(publications.map((publication) => text(publication, "isbn")))]
  const emails = [...new Set(publications.map((publication) => text(publication, "email_propietario")))]
  const [{ data: books, error: booksError }, owners, { data: categories, error: categoriesError }] =
    await Promise.all([
      supabase.from("libro").select("*").in("isbn", isbns),
      selectUsuarios((columns) => supabase.from("usuario").select(columns).in("email", emails)),
      supabase.from("libro_categoria").select("*").in("isbn", isbns),
    ])

  if (booksError) throw booksError
  if (categoriesError) throw categoriesError

  const booksByIsbn = new Map(((books || []) as DatabaseRow[]).map((book) => [text(book, "isbn"), book]))
  const ownersByEmail = new Map(((owners || []) as DatabaseRow[]).map((owner) => [text(owner, "email"), owner]))
  const categoriesByIsbn = new Map(
    ((categories || []) as DatabaseRow[]).map((category) => [text(category, "isbn"), category]),
  )

  return publications.map((publication) => {
    const isbn = text(publication, "isbn")
    const email = text(publication, "email_propietario")
    return toBook(
      publication,
      booksByIsbn.get(isbn),
      ownersByEmail.get(email),
      categoriesByIsbn.get(isbn),
      users,
      currentUser,
    )
  })
}

export async function findDatabaseBook(isbn: string, googleBook?: GoogleBookVolume): Promise<DatabaseRow> {
  const { data, error } = await supabase.from("libro").select("*").eq("isbn", isbn).maybeSingle()
  if (error) throw error
  const rating = googleBook?.ratingExterno
  const metadata = googleBook
    ? {
        google_books_id: googleBook.googleBooksId || null,
        titulo: googleBook.titulo || null,
        autores: googleBook.autor || null,
        // Solo se pisa el rating si Google Books devolvió uno (Open Library no lo trae).
        ...(rating != null && rating > 0 ? { puntuacion_externa: Math.min(5, rating) } : {}),
      }
    : undefined

  if (data) {
    if (!metadata) return data as DatabaseRow
    const { data: updatedBook, error: updateError } = await supabase
      .from("libro")
      .update(metadata)
      .eq("isbn", isbn)
      .select("*")
      .single()
    if (updateError) throw updateError
    return (updatedBook || data) as DatabaseRow
  }

  const insertMetadata = {
    google_books_id: googleBook?.googleBooksId || null,
    titulo: googleBook?.titulo || null,
    autores: googleBook?.autor || null,
    puntuacion_externa: rating != null && rating > 0 ? Math.min(5, rating) : null,
  }

  const { data: createdBook, error: insertError } = await supabase
    .from("libro")
    .insert({ isbn, ...insertMetadata })
    .select("*")
    .single()
  if (insertError) throw insertError
  if (!createdBook) throw new Error("Supabase no devolvió el libro creado.")
  return createdBook as DatabaseRow
}

export function databasePublicationId(book: Book): [string, string, string] {
  try {
    const id: unknown = JSON.parse(book.id)
    if (
      Array.isArray(id)
      && id.length === 3
      && id.every((part) => typeof part === "string")
    ) {
      return id as [string, string, string]
    }
  } catch {
    // Demo seed books do not have a database publication key.
  }
  throw new Error("Esta publicación de demostración no está guardada en la base de datos.")
}

export function databaseBook(
  publication: DatabaseRow,
  book: DatabaseRow,
  owner: DatabaseRow | undefined,
  category: DatabaseRow | undefined,
  users: User[],
  currentUser: User,
): Book {
  return toBook(publication, book, owner, category, users, currentUser)
}
