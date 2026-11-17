"use client"

import { useState, type FormEvent } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlusCircle,
  Search,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react"
import { useStore } from "./store"
import { BookCoverThumb } from "./cover-thumb"
import { isUserMatch, type GoogleBookVolume } from "@/lib/mercado-types"
import { findGoogleBookByIsbn } from "@/lib/google-books"
import { apiSearchBooksByText } from "@/lib/api"

const cleanIsbn = (isbn?: string) => (isbn || "").replace(/[^0-9X]/gi, "").toUpperCase()
const looksLikeIsbn = (text: string) => [10, 13].includes(cleanIsbn(text).length) && /^[0-9X\-\s]+$/i.test(text.trim())

/**
 * Tracker: el usuario sigue libros por ISBN. Es lo que guarda el backend y lo que usa para avisar
 * cuando alguien publica ese libro, así que las coincidencias de esta pantalla siguen la misma regla.
 */
export function TrackerScreen() {
  const { currentUser, trackedBooks, addToTracker, removeFromTracker, books, setSelectedBookId } = useStore()

  const [isAdding, setIsAdding] = useState(false)
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [results, setResults] = useState<GoogleBookVolume[]>([])
  const [selected, setSelected] = useState<GoogleBookVolume | null>(null)
  const [saving, setSaving] = useState(false)

  if (!currentUser) return null

  const myTracked = trackedBooks.filter((t) => isUserMatch(currentUser, t.userId))
  const alreadyTracked = (isbn: string) => myTracked.some((t) => cleanIsbn(t.isbn) === cleanIsbn(isbn))

  function resetForm() {
    setQuery("")
    setResults([])
    setSelected(null)
    setSearchError("")
  }

  async function handleSearch() {
    setSearchError("")
    setResults([])
    setSelected(null)
    const text = query.trim()
    if (text.length < 2) {
      setSearchError("Ingresá un ISBN o al menos dos letras del título.")
      return
    }
    setSearching(true)
    try {
      if (looksLikeIsbn(text)) {
        const book = await findGoogleBookByIsbn(cleanIsbn(text))
        if (book) {
          setSelected({ ...book, isbn: book.isbn || cleanIsbn(text) })
        } else {
          // Sin datos externos igual se puede seguir el ISBN; si alguien ya lo publicó, se usa ese título
          const enCatalogo = books.find((b) => cleanIsbn(b.isbn) === cleanIsbn(text))
          setSelected({
            googleBooksId: "",
            isbn: cleanIsbn(text),
            titulo: enCatalogo?.title || `Libro con ISBN ${cleanIsbn(text)}`,
            autor: enCatalogo?.author || "",
            descripcion: "",
            portadaUrl: "",
            editorial: "",
            anioPublicacion: "",
            categorias: [],
            paginas: null,
            ratingExterno: null,
          })
        }
      } else {
        const found = (await apiSearchBooksByText(text)).filter((b) => cleanIsbn(b.isbn))
        if (found.length === 0) {
          setSearchError("No encontramos libros con ese título. Probá con el ISBN de la contratapa.")
        }
        setResults(found.slice(0, 6))
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "No se pudo buscar el libro.")
    } finally {
      setSearching(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selected || saving) return
    if (alreadyTracked(selected.isbn)) {
      setSearchError("Ya estás siguiendo este libro.")
      return
    }
    setSaving(true)
    const ok = await addToTracker({
      isbn: selected.isbn,
      title: selected.titulo,
      author: selected.autor || undefined,
    })
    setSaving(false)
    if (ok) {
      resetForm()
      setIsAdding(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Radar de Libros</span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Tracker de Libros
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Seguí los libros que buscás y te avisamos apenas alguien los publique.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAdding((prev) => !prev)
            resetForm()
          }}
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-900 active:scale-[0.99] sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          <span>{isAdding ? "Cerrar formulario" : "Seguir nuevo libro"}</span>
        </button>
      </div>

      {/* Add form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-3xl border border-stone-200/85 bg-white p-5 shadow-[0_1px_3px_rgba(28,25,23,0.05)] animate-in fade-in slide-in-from-top-2 duration-150 sm:p-6"
        >
          <h2 className="font-serif text-lg font-bold tracking-tight text-stone-900">Buscar el libro</h2>
          <p className="mt-0.5 text-xs sm:text-sm text-stone-500">
            Escribí el ISBN de la contratapa o el título. Seguimos el libro por su ISBN: cuando alguien lo
            publique te llega una notificación.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="tracker-query" className="sr-only">
                ISBN o título
              </label>
              <input
                id="tracker-query"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (searchError) setSearchError("")
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void handleSearch()
                  }
                }}
                placeholder="Ej: 978-84-204-7183-9 o Rayuela"
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm sm:text-[15px] text-stone-900 outline-none transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={searching}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-50 px-4 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-800" aria-hidden="true" />
              ) : (
                <Search className="h-4 w-4 text-amber-800" aria-hidden="true" />
              )}
              <span>Buscar</span>
            </button>
          </div>

          {searchError && (
            <p className="mt-2.5 flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-rose-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{searchError}</span>
            </p>
          )}

          {results.length > 0 && !selected && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-xs font-medium text-stone-600">Elegí la edición que buscás:</p>
              {results.map((book) => (
                <button
                  key={book.isbn}
                  type="button"
                  onClick={() => setSelected(book)}
                  className="flex items-center gap-3 rounded-xl border border-stone-200/90 bg-white p-2.5 text-left transition-colors hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                >
                  <BookCoverThumb src={book.portadaUrl} className="h-12 w-9 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-900">{book.titulo}</p>
                    <p className="truncate text-xs text-stone-500">
                      {[book.autor, book.anioPublicacion, `ISBN ${book.isbn}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3">
              <BookCoverThumb src={selected.portadaUrl} className="h-12 w-9 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-900">{selected.titulo}</p>
                <p className="truncate text-xs text-stone-600">
                  {[selected.autor, `ISBN ${selected.isbn}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={() => {
                resetForm()
                setIsAdding(false)
              }}
              className="h-10 rounded-xl border border-stone-200/90 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selected || saving}
              className="h-10 rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            >
              {saving ? "Guardando..." : "Seguir este libro"}
            </button>
          </div>
        </form>
      )}

      {/* Tracked list */}
      <div className="space-y-4">
        {myTracked.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300/90 bg-white p-10 text-center sm:p-14">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
              <Target className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900">No tenés libros en seguimiento actualmente</h3>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-stone-500">
              Agregá los libros que deseás leer para recibir avisos apenas alguien los publique en el catálogo.
            </p>
          </div>
        ) : (
          myTracked.map((item) => {
            const itemIsbn = cleanIsbn(item.isbn)
            // Misma regla que el aviso del backend: mismo ISBN, disponible y de otro usuario
            const matches = books.filter(
              (b) =>
                itemIsbn &&
                cleanIsbn(b.isbn) === itemIsbn &&
                b.availability === "DISPONIBLE" &&
                !isUserMatch(currentUser, b.ownerId)
            )

            return (
              <article
                key={item.id}
                className="rounded-2xl sm:rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.03)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg font-bold tracking-tight text-stone-900">{item.title}</h3>
                    {item.author && <p className="mt-0.5 text-sm text-stone-500">{item.author}</p>}
                    {item.isbn && (
                      <span className="mt-2.5 inline-block rounded-lg border border-stone-200/80 bg-[#faf8f5] px-2.5 py-1 font-mono text-xs text-stone-600">
                        ISBN {item.isbn}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void removeFromTracker(item.id)}
                    title="Dejar de seguir"
                    aria-label={`Dejar de seguir ${item.title}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                  >
                    <Trash2 className="h-4.5 w-4.5" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-4 border-t border-stone-100 pt-3.5">
                  {matches.length > 0 ? (
                    <div>
                      <div className="mb-2.5 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-800">
                        <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        <span>Disponible ahora ({matches.length})</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {matches.map((match) => (
                          <button
                            key={match.id}
                            type="button"
                            onClick={() => setSelectedBookId(match.id)}
                            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/90 bg-emerald-50/55 p-3 text-left transition-colors hover:bg-emerald-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-stone-900">{match.title}</p>
                              <p className="truncate text-xs text-stone-600">
                                {match.condition} · De {match.ownerName}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold tabular-nums text-amber-900">
                                {match.points} pts
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400">
                      Nadie lo tiene publicado ahora. Te avisamos con una notificación cuando aparezca.
                    </p>
                  )}
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
