"use client"

import { useState } from "react"
import { Coins, BookMarked } from "lucide-react"
import { isUserMatch, type Book } from "@/lib/mercado-types"
import { evaluatePriceDeal } from "@/lib/price-evaluator"
import { useStore } from "./store"

const DEAL_BADGES = {
  green: {
    bg: "bg-emerald-50/95 text-emerald-800 border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  yellow: {
    bg: "bg-amber-50/95 text-amber-800 border-amber-200/80",
    dot: "bg-amber-500",
  },
  red: {
    bg: "bg-rose-50/95 text-rose-800 border-rose-200/80",
    dot: "bg-rose-500",
  },
}

export function BookCard({ book }: { book: Book }) {
  const { setSelectedBookId, currentUser } = useStore()
  const isMine = isUserMatch(currentUser, book.ownerId)
  const [imgFailed, setImgFailed] = useState(false)
  const evaluation = evaluatePriceDeal(
    book.points,
    book.category,
    book.condition,
    book.externalRating,
    book.referencePrice
  )
  const isAvailable = book.availability === "DISPONIBLE"

  return (
    <article
      onClick={() => setSelectedBookId(book.id)}
      className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200/80 bg-white shadow-[0_1px_3px_rgba(28,25,23,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-stone-300/90 hover:shadow-[0_10px_28px_rgba(28,25,23,0.08)] focus-within:ring-2 focus-within:ring-amber-700/60 focus-within:ring-offset-2 cursor-pointer active:scale-[0.99]"
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] sm:aspect-[16/11] w-full overflow-hidden bg-stone-100">
        {book.coverUrl && !imgFailed ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50/90 to-stone-200/80 text-stone-400">
            <BookMarked className="h-10 w-10 sm:h-11 sm:w-11 text-amber-800/35" aria-hidden="true" />
          </div>
        )}

        {/* Top Pills: Category & Price Deal */}
        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-center justify-between gap-1.5">
          <span
            title={book.category}
            className="max-w-[48%] truncate rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-stone-800 shadow-xs backdrop-blur-xs"
          >
            {book.category}
          </span>

          <span
            title={evaluation.hint}
            aria-label={`Evaluación de precio: ${evaluation.label}`}
            className={`shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold shadow-xs backdrop-blur-xs ${
              DEAL_BADGES[evaluation.deal].bg
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DEAL_BADGES[evaluation.deal].dot}`} />
            <span className="truncate max-w-[96px] sm:max-w-none">
              {evaluation.label.replace(/^Valor:\s*/i, "")}
            </span>
          </span>
        </div>

        {/* Las publicaciones propias también figuran en el catálogo: se distinguen */}
        {isMine && (
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-full bg-stone-900/85 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs">
            Tu publicación
          </span>
        )}

        {/* Availability Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/55 p-2 text-center backdrop-blur-[2px]">
            <span className="rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-stone-900 shadow-md">
              {book.availability === "RESERVADO" ? "En Intercambio" : "Intercambiado"}
            </span>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4">
        <div>
          <h3 className="font-serif text-base sm:text-[17px] font-bold leading-snug text-stone-900 line-clamp-1 transition-colors duration-150 group-hover:text-amber-900">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedBookId(book.id)
              }}
              className="w-full truncate text-left focus-visible:outline-none"
            >
              {book.title}
            </button>
          </h3>
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-stone-600 line-clamp-1">
            {book.author}
          </p>
        </div>

        {/* Condition & Points */}
        {/* En tarjetas angostas (mobile) los puntos bajan de línea en vez de cortar el estado */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-1.5 pt-2.5 border-t border-stone-100">
          <span
            title={book.condition}
            className="whitespace-nowrap rounded-md bg-stone-100/90 px-2 py-0.5 text-xs font-semibold text-stone-700"
          >
            {book.condition}
          </span>

          <div className="shrink-0 flex items-center gap-1 rounded-lg border border-amber-200/80 bg-amber-50/90 px-2.5 py-0.5 text-xs sm:text-sm font-bold text-amber-950">
            <Coins className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
            <span>{book.points} pts</span>
          </div>
        </div>
      </div>
    </article>
  )
}

export function BookCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200/70 bg-white shadow-[0_1px_3px_rgba(28,25,23,0.03)] animate-pulse"
    >
      <div className="aspect-[4/3] sm:aspect-[16/11] w-full bg-stone-200/70" />
      <div className="p-3.5 sm:p-4 space-y-2.5">
        <div className="h-4.5 w-4/5 rounded-md bg-stone-200/80" />
        <div className="h-3.5 w-3/5 rounded-md bg-stone-100" />
        <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-stone-100">
          <div className="h-5 w-16 rounded-md bg-stone-100" />
          <div className="h-6 w-16 rounded-lg bg-amber-100/70" />
        </div>
      </div>
    </div>
  )
}
