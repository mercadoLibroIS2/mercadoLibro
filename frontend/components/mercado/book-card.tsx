"use client"

import { Coins, Star, BookMarked } from "lucide-react"
import type { Book } from "@/lib/mercado-types"
import { evaluatePriceDeal } from "@/lib/price-evaluator"
import { useStore } from "./store"

const DEAL_BADGES = {
  green: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  yellow: {
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  red: {
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
}

export function BookCard({ book }: { book: Book }) {
  const { setSelectedBookId, viewUserProfile } = useStore()
  const evaluation = evaluatePriceDeal(book.points, book.category, book.condition, book.externalRating || 4.5)
  const isAvailable = book.availability === "DISPONIBLE"

  return (
    <article
      onClick={() => setSelectedBookId(book.id)}
      className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200 bg-white shadow-xs transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer active:scale-[0.98]"
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] sm:aspect-[16/11] w-full overflow-hidden bg-stone-100">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-stone-200 text-stone-400">
            <BookMarked className="h-10 w-10 sm:h-12 sm:w-12 text-amber-800/40" />
          </div>
        )}

        {/* Category Pill */}
        <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-sm md:text-base md:text-lg font-bold text-stone-800 shadow-xs backdrop-blur-xs">
            {book.category}
          </span>
        </div>

        {/* Semáforo Calidad-Precio */}
        <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
          <span
            title={evaluation.hint}
            aria-label={`Evaluación de precio: ${evaluation.label}`}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm md:text-base md:text-lg font-bold shadow-xs backdrop-blur-xs ${
              DEAL_BADGES[evaluation.deal].bg
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${DEAL_BADGES[evaluation.deal].dot}`} />
            <span className="truncate max-w-[100px] sm:max-w-none">{evaluation.label}</span>
          </span>
        </div>

        {/* Not Available Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-2 text-center">
            <span className="rounded-xl bg-white px-3 py-1.5 text-sm md:text-base md:text-lg font-bold uppercase tracking-wider text-stone-900 shadow-lg">
              {book.availability === "RESERVADO" ? "En Intercambio" : "Intercambiado"}
            </span>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <h3 className="font-serif text-base sm:text-lg font-bold leading-tight text-stone-900 line-clamp-1 group-hover:text-amber-900 transition-colors">
          {book.title}
        </h3>
        <p className="text-sm md:text-base md:text-lg font-medium text-stone-600 line-clamp-1 mt-1">{book.author}</p>

        {/* Condition & Points */}
        <div className="mt-3 flex items-center justify-between text-sm md:text-base md:text-lg text-stone-600">
          <span className="rounded-md bg-stone-100 px-2 py-0.5 font-semibold text-stone-800">
            {book.condition}
          </span>

          <div className="flex items-center gap-1.5 font-bold text-amber-950 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
            <Coins className="h-4 w-4 text-amber-700" />
            <span>{book.points} pts</span>
          </div>
        </div>
      </div>
    </article>
  )
}
