"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, BookPlus, Search } from "lucide-react"
import {
  createManualPublication,
  createPublication,
  searchCachedBooks,
  type BookCondition,
  type CachedBook,
} from "@/lib/publications"
import { useStore } from "./store"

const CONDITIONS: { value: BookCondition; label: string }[] = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "COMO_NUEVO", label: "Como nuevo" },
  { value: "BUENO", label: "Bueno" },
  { value: "ACEPTABLE", label: "Aceptable" },
  { value: "MALO", label: "Malo" },
]

export function SupabasePublishForm() {
  const { currentUser, setScreen, showToast } = useStore()
  const [mode, setMode] = useState<"catalog" | "manual">("catalog")
  const [query, setQuery] = useState("")
  const [books, setBooks] = useState<CachedBook[]>([])
  const [selectedBook, setSelectedBook] = useState<CachedBook | null>(null)
  const [manualIsbn, setManualIsbn] = useState("")
  const [manualTitle, setManualTitle] = useState("")
  const [manualAuthors, setManualAuthors] = useState("")
  const [condition, setCondition] = useState<BookCondition>("BUENO")
  const [points, setPoints] = useState("")
  const [comment, setComment] = useState("")
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const normalizedQuery = query.trim()
    if (mode !== "catalog" || normalizedQuery.length < 2 || selectedBook) {
      setBooks([])
      setLoadingBooks(false)
      return
    }

    let active = true
    const timeout = window.setTimeout(() => {
      setLoadingBooks(true)
      searchCachedBooks(normalizedQuery)
        .then((results) => {
          if (active) setBooks(results)
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : "No se pudieron buscar libros.")
        })
        .finally(() => {
          if (active) setLoadingBooks(false)
        })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [mode, query, selectedBook])

  if (!currentUser) return null

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const requestedPoints = Number(points)
    if (mode === "catalog" && !selectedBook) {
      setError("Seleccioná un libro de los resultados disponibles.")
      return
    }
    if (!Number.isSafeInteger(requestedPoints) || requestedPoints < 0) {
      setError("Ingresá un valor de puntos válido, igual o mayor a cero.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const changes = {
        estado_fisico: condition,
        valor_puntos_solicitado: requestedPoints,
        comentario: comment.trim() || null,
      }
      let publishedTitle: string
      if (mode === "manual") {
        const publishedBook = await createManualPublication({
            isbn: manualIsbn,
            titulo: manualTitle,
            autores: manualAuthors,
          }, changes)
        publishedTitle = publishedBook.titulo
      } else {
        if (!selectedBook) {
          setError("Seleccioná un libro de los resultados disponibles.")
          return
        }
        await createPublication(selectedBook, changes)
        publishedTitle = selectedBook.titulo
      }
      showToast(`"${publishedTitle}" se publicó con éxito.`)
      setScreen("perfil")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo publicar el libro.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-8">
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setScreen("perfil")}
          aria-label="Volver al perfil"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">Publicar un libro</h1>
          <p className="text-sm text-stone-600">Elegí un libro del catálogo y completá los datos de tu ejemplar.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs sm:p-7">
        <div>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Método para elegir el libro">
            <button
              type="button"
              aria-pressed={mode === "catalog"}
              onClick={() => {
                setMode("catalog")
                setError(null)
              }}
              className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === "catalog" ? "bg-amber-800 text-white" : "border border-stone-200 text-stone-700"}`}
            >
              Buscar en catálogo
            </button>
            <button
              type="button"
              aria-pressed={mode === "manual"}
              onClick={() => {
                setMode("manual")
                setSelectedBook(null)
                setError(null)
              }}
              className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === "manual" ? "bg-rose-700 text-white" : "border border-stone-200 text-stone-700"}`}
            >
              Carga manual temporal
            </button>
          </div>

          {mode === "manual" ? (
            <div className="space-y-4">
              <p role="note" className="rounded-xl border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-extrabold tracking-wide text-red-700">
                TEMPORAL HASTA IMPLEMENTAR GOOGLE BOOKS
              </p>
              <p className="text-sm text-stone-600">
                Los datos manuales se guardan en el catálogo bibliográfico local para poder vincular la publicación.
              </p>
              <label htmlFor="manual-isbn" className="block text-sm font-bold text-stone-800">
                ISBN *
                <input
                  id="manual-isbn"
                  type="text"
                  required={mode === "manual"}
                  value={manualIsbn}
                  onChange={(event) => setManualIsbn(event.target.value)}
                  placeholder="9780306406157"
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white p-3 text-base font-normal"
                />
              </label>
              <label htmlFor="manual-title" className="block text-sm font-bold text-stone-800">
                Título *
                <input
                  id="manual-title"
                  type="text"
                  required={mode === "manual"}
                  maxLength={255}
                  value={manualTitle}
                  onChange={(event) => setManualTitle(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white p-3 text-base font-normal"
                />
              </label>
              <label htmlFor="manual-authors" className="block text-sm font-bold text-stone-800">
                Autor *
                <input
                  id="manual-authors"
                  type="text"
                  required={mode === "manual"}
                  maxLength={255}
                  value={manualAuthors}
                  onChange={(event) => setManualAuthors(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white p-3 text-base font-normal"
                />
              </label>
            </div>
          ) : (
            <>
              <label htmlFor="cached-book-search" className="mb-1.5 block text-sm font-bold text-stone-800">
                Buscar libro *
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  id="cached-book-search"
                  type="search"
                  value={selectedBook ? selectedBook.titulo : query}
                  onChange={(event) => {
                    setSelectedBook(null)
                    setQuery(event.target.value)
                    setError(null)
                  }}
                  placeholder="Escribí al menos 2 letras del título"
                  autoComplete="off"
                  className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-3 text-base text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
                />
              </div>
              <p className="mt-1 text-xs text-stone-500">
                Solo podés seleccionar libros ya incorporados al catálogo.
              </p>
              {loadingBooks && <p className="mt-2 text-sm text-stone-500">Buscando…</p>}
              {!loadingBooks && query.trim().length >= 2 && !selectedBook && books.length === 0 && (
                <p className="mt-2 text-sm text-stone-500">No se encontraron libros en el catálogo.</p>
              )}
              {books.length > 0 && !selectedBook && (
                <ul className="mt-2 max-h-64 divide-y divide-stone-100 overflow-y-auto rounded-xl border border-stone-200">
                  {books.map((book) => (
                    <li key={book.isbn}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBook(book)
                          setQuery(book.titulo)
                          setBooks([])
                        }}
                        className="w-full px-3 py-2.5 text-left hover:bg-amber-50"
                      >
                        <span className="block font-semibold text-stone-900">{book.titulo}</span>
                        <span className="block text-sm text-stone-600">{book.autores || "Autor no disponible"}</span>
                        <span className="block text-xs text-stone-500">ISBN {book.isbn}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {mode === "catalog" && selectedBook && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Libro seleccionado: <strong>{selectedBook.titulo}</strong>
            {selectedBook.autores ? ` — ${selectedBook.autores}` : ""}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-stone-800">
            Estado físico *
            <select
              value={condition}
              onChange={(event) => setCondition(event.target.value as BookCondition)}
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white p-3 text-base font-normal"
            >
              {CONDITIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-stone-800">
            Puntos solicitados *
            <input
              type="number"
              min="0"
              step="1"
              required
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              placeholder="Ej. 50"
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white p-3 text-base font-normal"
            />
          </label>
        </div>

        <label className="block text-sm font-bold text-stone-800">
          Comentario (opcional)
          <textarea
            rows={3}
            maxLength={500}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Detalles del ejemplar..."
            className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white p-3 text-base font-normal"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
            {error}
          </p>
        )}

        <div className="flex justify-end border-t border-stone-100 pt-4">
          <button
            type="submit"
            disabled={saving || (mode === "catalog" && !selectedBook)}
            className="flex items-center gap-2 rounded-xl bg-amber-800 px-5 py-2.5 font-bold text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BookPlus className="h-4 w-4" />
            {saving ? "Publicando…" : "Publicar libro"}
          </button>
        </div>
      </form>
    </div>
  )
}
