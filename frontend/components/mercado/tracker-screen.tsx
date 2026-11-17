"use client"

import { useState, type FormEvent } from "react"
import {
  AlertCircle,
  BookOpen,
  Coins,
  ExternalLink,
  Loader2,
  PlusCircle,
  Search,
  Sparkles,
  Tag,
  Target,
  Trash2,
} from "lucide-react"
import { useStore } from "./store"
import { BookCoverThumb } from "./cover-thumb"
import {
  CATEGORIES,
  CONDITIONS,
  isUserMatch,
  type Condition,
} from "@/lib/mercado-types"
import { findGoogleBookByIsbn } from "@/lib/google-books"

const normalizeText = (s?: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

export function TrackerScreen() {
  const {
    currentUser,
    trackedBooks,
    addToTracker,
    removeFromTracker,
    books,
    setSelectedBookId,
  } = useStore()

  const [isAdding, setIsAdding] = useState(false)
  const [isbn, setIsbn] = useState("")
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [category, setCategory] = useState("")
  const [maxPoints, setMaxPoints] = useState("")
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([])
  const [privateNotes, setPrivateNotes] = useState("")
  const [searchingGoogleBooks, setSearchingGoogleBooks] = useState(false)
  const [googleBooksError, setGoogleBooksError] = useState("")
  const [googleBookPreview, setGoogleBookPreview] = useState<{
    titulo: string
    autor: string
    portadaUrl: string
  } | null>(null)

  if (!currentUser) return null

  const myTracked = trackedBooks.filter((t) => isUserMatch(currentUser, t.userId))

  async function handleGoogleBooksSearch() {
    setGoogleBooksError("")
    const clean = isbn.replace(/[^0-9X]/gi, "").trim()
    if (!clean) {
      setGoogleBooksError("Ingresá un código ISBN para buscar en Google Books.")
      return
    }

    setSearchingGoogleBooks(true)
    try {
      const result = await findGoogleBookByIsbn(clean)
      if (!result) {
        setGoogleBooksError("No se encontró ningún libro con ese ISBN.")
        return
      }

      setTitle(result.titulo || "")
      setAuthor(result.autor || "")
      if (result.categorias?.[0]) {
        setCategory(result.categorias[0])
      }
      setGoogleBookPreview({
        titulo: result.titulo,
        autor: result.autor,
        portadaUrl: result.portadaUrl,
      })
    } catch (err) {
      setGoogleBooksError(
        err instanceof Error ? err.message : "Error al buscar el ISBN."
      )
    } finally {
      setSearchingGoogleBooks(false)
    }
  }

  function toggleCondition(c: Condition) {
    setSelectedConditions((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
    )
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() && !isbn.trim()) return

    const finalTitle =
      title.trim() || (isbn.trim() ? `Libro (${isbn.trim()})` : "Libro seguido")

    addToTracker({
      isbn: isbn.trim() || undefined,
      title: finalTitle,
      author: author.trim() || undefined,
      category: category || undefined,
      maxPoints: maxPoints ? Number(maxPoints) : undefined,
      acceptableConditions: selectedConditions.length
        ? selectedConditions
        : undefined,
      privateNotes: privateNotes.trim() || undefined,
    })

    setIsbn("")
    setTitle("")
    setAuthor("")
    setCategory("")
    setMaxPoints("")
    setSelectedConditions([])
    setPrivateNotes("")
    setGoogleBookPreview(null)
    setGoogleBooksError("")
    setIsAdding(false)
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
            Recibí alertas automáticas cuando alguien publique un título que estás buscando.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding((prev) => !prev)}
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-900 active:scale-[0.99] sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          <span>{isAdding ? "Cerrar formulario" : "Seguir nuevo libro"}</span>
        </button>
      </div>

      {/* Add to Tracker Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-3xl border border-stone-200/85 bg-white p-5 shadow-[0_1px_3px_rgba(28,25,23,0.05)] animate-in fade-in slide-in-from-top-2 duration-150 sm:p-6"
        >
          <h2 className="font-serif text-lg font-bold tracking-tight text-stone-900">
            Definir criterios de seguimiento
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-stone-500">
            Con el ISBN te avisamos por notificación apenas alguien lo publique. El tope de puntos y los
            estados filtran las coincidencias que ves en esta pantalla.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label
                htmlFor="tracker-isbn"
                className="mb-1.5 block text-sm font-semibold tracking-tight text-stone-800"
              >
                ISBN del libro (opcional)
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="tracker-isbn"
                  type="text"
                  placeholder="Ej: 978-84-204-7183-9"
                  value={isbn}
                  onChange={(e) => {
                    setIsbn(e.target.value)
                    if (googleBooksError) setGoogleBooksError("")
                  }}
                  className="h-11 flex-1 rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm text-stone-900 outline-none transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15"
                />
                <button
                  type="button"
                  onClick={handleGoogleBooksSearch}
                  disabled={searchingGoogleBooks || !isbn.trim()}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-4 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                >
                  {searchingGoogleBooks ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-800" aria-hidden="true" />
                  ) : (
                    <Search className="h-4 w-4 text-amber-800" aria-hidden="true" />
                  )}
                  <span>Buscar ISBN</span>
                </button>
              </div>

              {googleBooksError && (
                <p
                  role="alert"
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{googleBooksError}</span>
                </p>
              )}

              {googleBookPreview && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-stone-200/80 bg-[#faf8f5] p-3">
                  <BookCoverThumb src={googleBookPreview.portadaUrl} className="h-12 w-9 rounded-md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-900">
                      {googleBookPreview.titulo}
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      {googleBookPreview.autor}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="tracker-title"
                  className="mb-1.5 block text-sm font-semibold tracking-tight text-stone-800"
                >
                  Título buscado
                </label>
                <input
                  id="tracker-title"
                  type="text"
                  placeholder="Ej: Rayuela"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 w-full rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm text-stone-900 outline-none transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15"
                />
              </div>

              <div>
                <label
                  htmlFor="tracker-author"
                  className="mb-1.5 block text-sm font-semibold tracking-tight text-stone-800"
                >
                  Autor (opcional)
                </label>
                <input
                  id="tracker-author"
                  type="text"
                  placeholder="Ej: Julio Cortázar"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="h-11 w-full rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm text-stone-900 outline-none transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15"
                />
              </div>

              <div>
                <label
                  htmlFor="tracker-category"
                  className="mb-1.5 block text-sm font-semibold tracking-tight text-stone-800"
                >
                  Categoría
                </label>
                <select
                  id="tracker-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-11 w-full rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm text-stone-900 outline-none transition-all hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15"
                >
                  <option value="">Cualquier categoría</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tracker-max-points"
                  className="mb-1.5 block text-sm font-semibold tracking-tight text-stone-800"
                >
                  Tope máximo de puntos
                </label>
                <div className="relative">
                  <Coins
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700"
                    aria-hidden="true"
                  />
                  <input
                    id="tracker-max-points"
                    type="number"
                    min={1}
                    placeholder="Ej: 60"
                    value={maxPoints}
                    onChange={(e) => setMaxPoints(e.target.value)}
                    className="h-11 w-full rounded-xl border border-stone-200/90 bg-white pl-10 pr-12 text-sm tabular-nums text-stone-900 outline-none transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                    pts
                  </span>
                </div>
              </div>
            </div>

            <div>
              <span className="mb-2 block text-sm font-semibold tracking-tight text-stone-800">
                Estados aceptables (opcional)
              </span>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((cond) => {
                  const active = selectedConditions.includes(cond)
                  return (
                    <button
                      key={cond}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleCondition(cond)}
                      className={`h-9 rounded-full border px-3.5 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 ${
                        active
                          ? "border-amber-800 bg-amber-800 text-white"
                          : "border-stone-200/90 bg-white text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      {cond}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="tracker-notes"
                className="mb-1.5 block text-sm font-semibold tracking-tight text-stone-800"
              >
                Notas privadas
              </label>
              <input
                id="tracker-notes"
                type="text"
                placeholder="Ej: Prefiero edición tapa dura o anotada..."
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                className="h-11 w-full rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm text-stone-900 outline-none transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="h-10 rounded-xl border border-stone-200/90 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!title.trim() && !isbn.trim()}
                className="h-10 rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                Guardar en Tracker
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tracked List */}
      <div className="space-y-4">
        {myTracked.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300/90 bg-white p-10 text-center sm:p-14">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
              <Target className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              No tenés libros en seguimiento actualmente
            </h3>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-stone-500">
              Agregá los libros que deseás leer para recibir avisos apenas alguien los publique en el catálogo.
            </p>
          </div>
        ) : (
          myTracked.map((item) => {
            const cleanItemIsbn = item.isbn
              ? item.isbn.replace(/[^0-9X]/gi, "").trim()
              : ""
            const matches = books.filter((b) => {
              if (
                b.availability !== "DISPONIBLE" ||
                isUserMatch(currentUser, b.ownerId)
              ) {
                return false
              }
              const bIsbn = b.isbn
                ? b.isbn.replace(/[^0-9X]/gi, "").trim()
                : ""
              const isbnMatches = Boolean(
                cleanItemIsbn && bIsbn && cleanItemIsbn === bIsbn
              )
              const titleMatches = Boolean(
                item.title &&
                  (normalizeText(b.title).includes(normalizeText(item.title)) ||
                    normalizeText(item.title).includes(normalizeText(b.title)))
              )

              if (!isbnMatches && !titleMatches) return false
              if (item.maxPoints && b.points > item.maxPoints) return false
              if (
                item.acceptableConditions?.length &&
                !item.acceptableConditions.includes(b.condition)
              ) {
                return false
              }
              return true
            })

            return (
              <article
                key={item.id}
                className="rounded-2xl sm:rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.03)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-lg font-bold tracking-tight text-stone-900">
                        {item.title}
                      </h3>
                      {item.category && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-stone-200/80 bg-stone-100/80 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                          <Tag className="h-3 w-3 text-stone-400" aria-hidden="true" />
                          <span>{item.category}</span>
                        </span>
                      )}
                    </div>

                    {item.author && (
                      <p className="mt-0.5 text-sm text-stone-500">
                        Autor: {item.author}
                      </p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      {item.maxPoints && (
                        <span className="rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1 font-semibold tabular-nums text-amber-900">
                          Hasta {item.maxPoints} pts
                        </span>
                      )}

                      {item.acceptableConditions &&
                        item.acceptableConditions.length > 0 && (
                          <span className="rounded-lg border border-stone-200/80 bg-[#faf8f5] px-2.5 py-1 font-medium text-stone-700">
                            {item.acceptableConditions.join(", ")}
                          </span>
                        )}

                      {item.isbn && (
                        <span className="rounded-lg border border-stone-200/80 bg-[#faf8f5] px-2.5 py-1 font-mono text-stone-600">
                          ISBN {item.isbn}
                        </span>
                      )}
                    </div>

                    {item.privateNotes && (
                      <p className="mt-2 text-xs italic text-stone-500">
                        Nota: {item.privateNotes}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromTracker(item.id)}
                    title="Dejar de seguir"
                    aria-label={`Dejar de seguir ${item.title}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                  >
                    <Trash2 className="h-4.5 w-4.5" aria-hidden="true" />
                  </button>
                </div>

                {/* Live Catalog Matches */}
                <div className="mt-4 border-t border-stone-100 pt-3.5">
                  {matches.length > 0 ? (
                    <div>
                      <div className="mb-2.5 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-800">
                        <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        <span>Coincidencias encontradas ({matches.length})</span>
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
                              <p className="truncate text-sm font-semibold text-stone-900">
                                {match.title}
                              </p>
                              <p className="truncate text-xs text-stone-600">
                                {match.condition} · De {match.ownerName}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold tabular-nums text-amber-900">
                                {match.points} pts
                              </span>
                              <ExternalLink
                                className="h-3.5 w-3.5 text-emerald-700"
                                aria-hidden="true"
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400">
                      Sin coincidencias activas en este momento. Seguiremos buscando por vos.
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
