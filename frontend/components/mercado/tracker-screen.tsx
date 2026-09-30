"use client"

import { useState } from "react"
import {
  Target,
  PlusCircle,
  Trash2,
  Sparkles,
  BookOpen,
  Coins,
  ExternalLink,
  Tag,
} from "lucide-react"
import { useStore } from "./store"
import { CATEGORIES, CONDITIONS, type Condition } from "@/lib/mercado-types"

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
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [category, setCategory] = useState("")
  const [maxPoints, setMaxPoints] = useState("")
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([])
  const [privateNotes, setPrivateNotes] = useState("")

  if (!currentUser) return null

  const myTracked = trackedBooks.filter((t) => t.userId === currentUser.id)

  function toggleCondition(c: Condition) {
    if (selectedConditions.includes(c)) {
      setSelectedConditions(selectedConditions.filter((item) => item !== c))
    } else {
      setSelectedConditions([...selectedConditions, c])
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    addToTracker({
      title: title.trim(),
      author: author.trim() || undefined,
      category: category || undefined,
      maxPoints: maxPoints ? Number(maxPoints) : undefined,
      acceptableConditions: selectedConditions.length ? selectedConditions : undefined,
      privateNotes: privateNotes.trim() || undefined,
    })

    setTitle("")
    setAuthor("")
    setCategory("")
    setMaxPoints("")
    setSelectedConditions([])
    setPrivateNotes("")
    setIsAdding(false)
  }

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-amber-800 mb-1">
            <Target className="h-4 w-4" />
            <span className="text-sm md:text-base font-bold uppercase tracking-wider">
              Radar de Libros
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Tracker de Libros
          </h1>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-amber-800 px-4 py-2.5 text-base md:text-lg font-bold text-white hover:bg-amber-900 transition-all shadow-xs active:scale-95 self-start sm:self-auto"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          <span>{isAdding ? "Cerrar formulario" : "Seguir nuevo libro"}</span>
        </button>
      </div>

      {/* Add to Tracker Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl sm:rounded-3xl border border-amber-200 bg-amber-50/50 p-4 sm:p-6 shadow-xs animate-in fade-in slide-in-from-top-2 duration-150 mb-6"
        >
          <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 mb-3">
            Definir Criterios de Seguimiento
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-base md:text-lg font-bold text-stone-700 mb-1">
                Título del libro *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Ficciones"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base md:text-lg outline-none focus:border-amber-700"
              />
            </div>

            <div>
              <label className="block text-base md:text-lg font-bold text-stone-700 mb-1">
                Autor (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Jorge Luis Borges"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base md:text-lg outline-none focus:border-amber-700"
              />
            </div>

            <div>
              <label className="block text-base md:text-lg font-bold text-stone-700 mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base md:text-lg outline-none focus:border-amber-700"
              >
                <option value="">Cualquier categoría</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-base md:text-lg font-bold text-stone-700 mb-1">
                Puntos Máximos
              </label>
              <input
                type="number"
                min={1}
                placeholder="Ej. 150"
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base md:text-lg outline-none focus:border-amber-700"
              />
            </div>
          </div>

          {/* Acceptable Conditions checkboxes */}
          <div className="mt-3.5">
            <label className="block text-base md:text-lg font-bold text-stone-700 mb-1.5">
              Estados físicos aceptables:
            </label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((cond) => {
                const selected = selectedConditions.includes(cond)
                return (
                  <button
                    type="button"
                    key={cond}
                    onClick={() => {
                      if (selected) {
                        setSelectedConditions(selectedConditions.filter((c) => c !== cond))
                      } else {
                        setSelectedConditions([...selectedConditions, cond])
                      }
                    }}
                    className={`rounded-xl px-3.5 py-1.5 text-sm md:text-base md:text-lg font-semibold transition-colors ${
                      selected
                        ? "bg-amber-800 text-white shadow-xs"
                        : "bg-white border border-stone-300 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    {cond}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2.5 border-t border-amber-200/60 pt-3.5">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-base md:text-lg font-semibold text-stone-600 hover:bg-stone-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-800 px-5 py-2 text-base md:text-lg font-bold text-white shadow-xs hover:bg-amber-900"
            >
              Guardar en Tracker
            </button>
          </div>
        </form>
      )}

      {/* Tracked Books List */}
      <div className="space-y-3 sm:space-y-4">
        {myTracked.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white p-8 sm:p-12 text-center">
            <Target className="h-10 w-10 text-stone-300 mb-3" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-stone-800">
              No tenés libros en seguimiento actualmente
            </h3>
            <p className="mt-1 text-sm md:text-base md:text-lg text-stone-500 max-w-sm">
              Agregá los títulos que estás buscando para recibir alertas automáticas cuando alguien los publique.
            </p>
          </div>
        ) : (
          myTracked.map((item) => {
            const matches = books.filter(
              (b) =>
                b.availability === "DISPONIBLE" &&
                b.ownerId !== currentUser.id &&
                b.title.toLowerCase().includes(item.title.toLowerCase()) &&
                (!item.maxPoints || b.points <= item.maxPoints) &&
                (!item.acceptableConditions?.length || item.acceptableConditions.includes(b.condition))
            )

            return (
              <div
                key={item.id}
                className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900">
                        {item.title}
                      </h3>
                      {item.category && (
                        <span className="rounded-lg bg-stone-100 px-2.5 py-0.5 text-sm md:text-base font-semibold text-stone-700">
                          {item.category}
                        </span>
                      )}
                    </div>

                    {item.author && (
                      <p className="text-sm md:text-base md:text-lg text-stone-600 mt-0.5">Autor: {item.author}</p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm md:text-base md:text-lg text-stone-600">
                      {item.maxPoints && (
                        <span className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-amber-900 font-bold">
                          Hasta {item.maxPoints} pts
                        </span>
                      )}

                      {item.acceptableConditions && item.acceptableConditions.length > 0 && (
                        <span className="rounded-lg bg-stone-100 px-2.5 py-0.5 text-stone-700 font-medium">
                          {item.acceptableConditions.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromTracker(item.id)}
                    className="flex items-center gap-1 text-sm md:text-base md:text-lg text-red-600 hover:text-red-800 p-2 rounded-xl hover:bg-red-50 transition-colors shrink-0"
                    title="Dejar de seguir"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Matches Section */}
                <div className="mt-3.5 pt-3.5 border-t border-stone-100">
                  {matches.length > 0 ? (
                    <div>
                      <div className="flex items-center gap-1.5 text-sm md:text-base md:text-lg font-bold text-emerald-800 mb-2.5">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        <span>Coincidencias encontradas ({matches.length})</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {matches.map((match) => (
                          <div
                            key={match.id}
                            onClick={() => setSelectedBookId(match.id)}
                            className="flex items-center justify-between gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 cursor-pointer hover:bg-emerald-100/60 transition-colors"
                          >
                            <div className="truncate pr-2">
                              <p className="text-base md:text-lg font-bold text-stone-900 truncate">
                                {match.title}
                              </p>
                              <p className="text-sm md:text-base text-stone-600 truncate">
                                {match.condition} • De {match.ownerName}
                              </p>
                            </div>

                            <span className="rounded-xl bg-amber-100 px-2.5 py-1 text-sm md:text-base md:text-lg font-bold text-amber-900 shrink-0">
                              {match.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm md:text-base md:text-lg text-stone-500 italic">
                      Sin publicaciones compatibles por el momento. Te avisaremos cuando se publique.
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
