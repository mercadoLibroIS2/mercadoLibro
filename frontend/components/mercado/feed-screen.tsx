"use client"

import { useState } from "react"
import {
  Sparkles,
  SlidersHorizontal,
} from "lucide-react"
import { useStore } from "./store"
import { BookCard } from "./book-card"
import { CATEGORIES, CONDITIONS } from "@/lib/mercado-types"

export function FeedScreen() {
  const {
    books,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
  } = useStore()

  const [selectedCondition, setSelectedCondition] = useState<string>("Todas")
  const [maxPoints, setMaxPoints] = useState<number>(500)
  const [showFilters, setShowFilters] = useState(false)

  // Filter books
  const filteredBooks = books.filter((book) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = book.title.toLowerCase().includes(q)
      const matchAuthor = book.author.toLowerCase().includes(q)
      const matchCat = book.category.toLowerCase().includes(q)
      const matchIsbn = book.isbn ? book.isbn.includes(q) : false
      if (!matchTitle && !matchAuthor && !matchCat && !matchIsbn) return false
    }

    // Category
    if (selectedCategory !== "Todas" && book.category !== selectedCategory) {
      return false
    }

    // Condition
    if (selectedCondition !== "Todas" && book.condition !== selectedCondition) {
      return false
    }

    // Points
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
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-amber-800 mb-1">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm md:text-base font-bold uppercase tracking-wider">
              Catálogo de la Comunidad
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Libros Disponibles
          </h1>
        </div>

        {/* Filter Toggle Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="text-sm md:text-base md:text-lg font-semibold text-stone-600 hover:text-amber-900 hover:underline px-2.5 py-1.5"
            >
              Limpiar filtros
            </button>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-base md:text-lg font-bold transition-all ${
              showFilters || selectedCondition !== "Todas" || maxPoints < 500
                ? "border-amber-300 bg-amber-50 text-amber-900 shadow-xs"
                : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filtros</span>
            {(selectedCondition !== "Todas" || maxPoints < 500) && (
              <span className="h-2 w-2 rounded-full bg-amber-800" />
            )}
          </button>
        </div>
      </div>

      {/* Horizontal Category Scroll */}
      <div className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-4 py-2 text-base md:text-lg font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-amber-800 text-white shadow-xs"
                : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Collapsible Advanced Filters Tray */}
      {showFilters && (
        <div className="mt-3 rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm md:text-base font-bold uppercase tracking-wider text-stone-600 mb-2 block">
                Estado Físico
              </label>
              <div className="flex flex-wrap gap-2">
                {["Todas", ...CONDITIONS].map((cond) => (
                  <button
                    key={cond}
                    onClick={() => setSelectedCondition(cond)}
                    className={`rounded-xl px-3.5 py-1.5 text-base md:text-lg font-semibold transition-colors ${
                      selectedCondition === cond
                        ? "bg-amber-800 text-white shadow-xs"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm md:text-base font-bold uppercase tracking-wider text-stone-600">
                  Puntos Máximos
                </label>
                <span className="text-sm md:text-base md:text-lg font-bold text-amber-900 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                  Hasta {maxPoints} pts
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value))}
                className="w-full accent-amber-800 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Count & Active Filters Pills */}
      <div className="mt-4 mb-3 flex items-center justify-between text-sm md:text-base md:text-lg text-stone-600">
        <div className="flex items-center gap-2">
          <span>
            Mostrando <strong className="text-stone-900 font-bold">{filteredBooks.length}</strong> libros
          </span>
          {hasActiveFilters && (
            <span className="hidden sm:inline-block text-stone-400">• Filtros aplicados</span>
          )}
        </div>
        {searchQuery && (
          <span className="truncate max-w-[220px] font-medium text-amber-950 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
            &ldquo;{searchQuery}&rdquo;
          </span>
        )}
      </div>

      {/* 2-Column Mobile Grid / 3-4 on Desktop */}
      {filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white p-8 sm:p-12 text-center my-4 shadow-xs">
          <Sparkles className="h-10 w-10 text-stone-300 mb-3" />
          <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
            No encontramos libros con esos criterios
          </h3>
          <p className="text-base md:text-lg text-stone-600 max-w-sm mt-1 mb-4 leading-relaxed">
            Probá cambiando de categoría, ampliando el rango de puntos o restableciendo los filtros de búsqueda.
          </p>
          <button
            onClick={handleClearAllFilters}
            className="flex items-center gap-2 rounded-xl bg-amber-800 px-5 py-2.5 text-base md:text-lg font-bold text-white shadow-xs hover:bg-amber-900 transition-all active:scale-95"
          >
            Restablecer todos los filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
