"use client"

import { useState } from "react"
import {
  Sparkles,
  SlidersHorizontal,
  Loader2,
} from "lucide-react"
import { useStore } from "./store"
import { BookCard, BookCardSkeleton } from "./book-card"
import { CATEGORIES, CONDITIONS } from "@/lib/mercado-types"

export function FeedScreen() {
  const {
    books,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    isLoadingCatalog,
  } = useStore()

  const [selectedCondition, setSelectedCondition] = useState<string>("Todas")
  const [maxPoints, setMaxPoints] = useState<number>(500)
  const [showFilters, setShowFilters] = useState(false)

  const filteredBooks = books.filter((book) => {
    // Los ya intercambiados o eliminados no se muestran (los reservados sí, marcados como tales)
    if (book.availability === "INTERCAMBIADO" || book.availability === "ELIMINADO") return false
    if (
      (book.title.startsWith("Libro (") && book.author === "Autor desconocido") ||
      book.author === "Autor desconocido" ||
      book.ownerId.includes("testuser") ||
      book.ownerId.includes("mail@gmail")
    ) {
      return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = book.title.toLowerCase().includes(q)
      const matchAuthor = book.author.toLowerCase().includes(q)
      const matchCat = book.category.toLowerCase().includes(q)
      const matchIsbn = book.isbn ? book.isbn.includes(q) : false
      if (!matchTitle && !matchAuthor && !matchCat && !matchIsbn) return false
    }

    if (selectedCategory !== "Todas" && book.category !== selectedCategory) {
      return false
    }

    if (selectedCondition !== "Todas" && book.condition !== selectedCondition) {
      return false
    }

    if (book.points > maxPoints) {
      return false
    }

    return true
  })

  const allCategories = ["Todas", ...CATEGORIES]
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "Todas" ||
    selectedCondition !== "Todas" ||
    maxPoints < 500

  function handleClearAllFilters() {
    setSearchQuery("")
    setSelectedCategory("Todas")
    setSelectedCondition("Todas")
    setMaxPoints(500)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5 sm:mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-amber-800 mb-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-[11px] font-bold uppercase tracking-[0.08em]">
              Catálogo de la Comunidad
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Libros Disponibles
          </h1>
        </div>

        {/* Filter Toggle & Clear */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-stone-600 transition-colors hover:text-amber-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50"
            >
              Limpiar filtros
            </button>
          )}

          <button
            type="button"
            aria-expanded={showFilters}
            onClick={() => setShowFilters(!showFilters)}
            className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 active:scale-[0.98] ${
              showFilters || selectedCondition !== "Todas" || maxPoints < 500
                ? "border-amber-300 bg-amber-50 text-amber-950 shadow-xs"
                : "border-stone-200/90 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span>Filtros</span>
            {(selectedCondition !== "Todas" || maxPoints < 500) && (
              <span className="h-2 w-2 rounded-full bg-amber-800" />
            )}
          </button>
        </div>
      </div>

      {/* Horizontal Category Scroll */}
      <div className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-none" role="group" aria-label="Filtrar por categoría">
        {allCategories.map((cat) => {
          const active = selectedCategory === cat
          return (
            <button
              type="button"
              key={cat}
              aria-pressed={active}
              onClick={() => setSelectedCategory(cat)}
              className={`h-9 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 active:scale-[0.98] ${
                active
                  ? "bg-amber-800 text-white shadow-xs"
                  : "border border-stone-200/80 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900"
              }`}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Collapsible Advanced Filters Tray */}
      {showFilters && (
        <div className="mt-3 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-[0_4px_16px_rgba(28,25,23,0.04)] animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
                Estado Físico
              </span>
              <div className="flex flex-wrap gap-2">
                {["Todas", ...CONDITIONS].map((cond) => {
                  const active = selectedCondition === cond
                  return (
                    <button
                      type="button"
                      key={cond}
                      aria-pressed={active}
                      onClick={() => setSelectedCondition(cond)}
                      className={`h-9 rounded-xl px-3.5 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 ${
                        active
                          ? "bg-amber-800 text-white shadow-xs"
                          : "bg-stone-100 text-stone-700 hover:bg-stone-200/80"
                      }`}
                    >
                      {cond}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <label
                  htmlFor="filter-max-points"
                  className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500"
                >
                  Puntos Máximos
                </label>
                <span className="rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs sm:text-sm font-bold text-amber-900">
                  Hasta {maxPoints} pts
                </span>
              </div>
              <input
                id="filter-max-points"
                type="range"
                min={20}
                max={500}
                step={10}
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer accent-amber-800"
              />
              <div className="mt-1.5 flex justify-between text-[11px] font-medium text-stone-400">
                <span>20 pts</span>
                <span>500 pts</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Count & Active Search Pill */}
      <div className="mt-5 mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
        <div className="flex items-center gap-2.5">
          <span>
            Mostrando <strong className="font-bold text-stone-900">{filteredBooks.length}</strong> libros
          </span>
          {hasActiveFilters && (
            <span className="hidden sm:inline-block text-stone-400">• Filtros aplicados</span>
          )}
          {isLoadingCatalog && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
              <Loader2 className="h-3 w-3 animate-spin text-amber-700" aria-hidden="true" />
              Sincronizando...
            </span>
          )}
        </div>
        {searchQuery && (
          <span className="max-w-[220px] truncate rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs sm:text-sm font-medium text-amber-950">
            &ldquo;{searchQuery}&rdquo;
          </span>
        )}
      </div>

      {/* Catalog Grid / Skeletons / Empty State */}
      {isLoadingCatalog && filteredBooks.length === 0 ? (
        <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="my-6 flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300/90 bg-white p-8 sm:p-12 text-center shadow-[0_1px_3px_rgba(28,25,23,0.03)]">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </span>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
            No encontramos libros con esos criterios
          </h3>
          <p className="mt-1.5 mb-5 max-w-sm text-sm sm:text-[15px] leading-relaxed text-stone-600">
            Probá cambiando de categoría, ampliando el rango de puntos o restableciendo los filtros de búsqueda.
          </p>
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="flex h-11 items-center gap-2 rounded-xl bg-amber-800 px-5 text-sm sm:text-[15px] font-semibold text-white shadow-sm transition-all duration-150 hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Restablecer todos los filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
