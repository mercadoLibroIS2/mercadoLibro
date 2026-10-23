import type { Book, Condition, GoogleBookVolume, User } from "./mercado-types"
import { CATEGORIES } from "./mercado-types"
import { calculateReferencePrice } from "./price-evaluator"
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
  const ownerName = text(owner || {}, "nombre_usuario", text(owner || {}, "nombre", email.split("@")[0]))
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
    ownerId: isCurrentUser ? currentUser.id : knownUser?.id || email,
    ownerName,
    ownerRating: rating,
    ownerTrades: knownUser?.totalTrades || 0,
    availability: ({
      DISPONIBLE: "DISPONIBLE",
      RESERVADA: "RESERVADO",
      VENDIDA: "INTERCAMBIADO",
      ELIMINADA: "ELIMINADO",
    }[text(publication, "estado_publicacion")] || "DISPONIBLE") as Book["availability"],
    referencePrice: number(publication, "valor_referencia_calculado")
      || calculateReferencePrice(selectedCategory, condition, number(book || {}, "puntuacion_externa", 4.5)),
    externalRating: number(book || {}, "puntuacion_externa", 4.5),
    createdAt: timestamp,
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
  const [{ data: books, error: booksError }, { data: owners, error: ownersError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      supabase.from("libro").select("*").in("isbn", isbns),
      supabase.from("usuario").select("*").in("email", emails),
      supabase.from("libro_categoria").select("*").in("isbn", isbns),
    ])

  if (booksError) throw booksError
  if (ownersError) throw ownersError
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
  const metadata = googleBook
    ? {
        google_books_id: googleBook.googleBooksId || null,
        titulo: googleBook.titulo || null,
        autores: googleBook.autor || null,
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
