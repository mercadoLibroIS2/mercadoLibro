"use client"

import { useEffect, useState, type FormEvent } from "react"
import { AlertCircle, BookOpen, Sparkles, Star, X } from "lucide-react"
import { useStore } from "./store"
import { BookCoverThumb } from "./cover-thumb"
import { isUserMatch } from "@/lib/mercado-types"
import { BONO_RESENIA } from "@/lib/puntos"

const RATING_LABELS: Record<number, string> = {
  5: "Excelente experiencia (5/5)",
  4: "Muy bueno (4/5)",
  3: "Bueno (3/5)",
  2: "Regular (2/5)",
  1: "Malo (1/5)",
}

export function ReviewModal() {
  const { reviewTrade, setReviewTrade, currentUser, books, addReview } = useStore()
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [comment, setComment] = useState<string>("")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    setRating(5)
    setHoverRating(0)
    setComment("")
    setError("")
  }, [reviewTrade?.id])

  useEffect(() => {
    if (!reviewTrade) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setReviewTrade(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [reviewTrade, setReviewTrade])

  if (!reviewTrade || !currentUser) return null

  const isRequester = isUserMatch(currentUser, reviewTrade.requesterId)
  const targetUserId = isRequester ? reviewTrade.ownerId : reviewTrade.requesterId
  const targetUserName = isRequester
    ? reviewTrade.ownerName
    : reviewTrade.requesterName

  const requestedBook = books.find((b) => b.id === reviewTrade.requestedBookId)
  // Un libro ya intercambiado no está en el catálogo: usar el título que informa el backend
  const bookTitle = requestedBook?.title || reviewTrade.requestedBookTitle || "Libro intercambiado"
  const activeRating = hoverRating || rating

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!comment.trim()) {
      setError("Por favor escribí un breve comentario sobre la experiencia.")
      return
    }

    addReview(
      reviewTrade!.id,
      targetUserId,
      rating,
      comment.trim(),
      bookTitle
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onClick={() => setReviewTrade(null)}
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-stone-200/90 bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 sm:rounded-3xl sm:p-6 sm:zoom-in-95 duration-200"
      >
        <div className="flex justify-center pb-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-stone-300" aria-hidden="true" />
        </div>

        <button
          type="button"
          onClick={() => setReviewTrade(null)}
          aria-label="Cerrar modal de calificación"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
        >
          <X className="h-4.5 w-4.5" aria-hidden="true" />
        </button>

        <div className="pt-1 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <Star className="h-6 w-6 fill-amber-500 text-amber-600" aria-hidden="true" />
          </span>
          <h3
            id="review-modal-title"
            className="font-serif text-xl font-bold tracking-tight text-stone-900"
          >
            Calificar a {targetUserName}
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Tu opinión ayuda a construir confianza en la comunidad.
          </p>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-[#faf8f5] p-3 text-left">
            <BookCoverThumb src={requestedBook?.coverUrl} className="h-12 w-9" />
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                Ejemplar intercambiado
              </span>
              <p className="truncate text-sm font-semibold text-stone-900">{bookTitle}</p>
              {requestedBook?.author && (
                <p className="truncate text-xs text-stone-500">{requestedBook.author}</p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4 overflow-y-auto">
          {/* Star selector (first 5 button[type="button"] in form for E2E parity) */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5" role="group" aria-label="Puntuación de 1 a 5 estrellas">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  aria-label={`${star} ${star === 1 ? "estrella" : "estrellas"}`}
                  aria-pressed={rating === star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="rounded-lg p-1.5 transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      activeRating >= star
                        ? "fill-amber-500 text-amber-500"
                        : "text-stone-300"
                    }`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <p className="text-xs sm:text-sm font-semibold text-amber-900">
              {RATING_LABELS[activeRating]}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="review-comment"
              className="text-sm font-semibold tracking-tight text-stone-800"
            >
              Comentario de la experiencia
            </label>
            <textarea
              id="review-comment"
              rows={3}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value)
                if (error) setError("")
              }}
              placeholder="¿Cómo estuvo el estado del libro, la puntualidad y el trato?..."
              aria-invalid={error ? true : undefined}
              className={
                "w-full resize-none rounded-xl border bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-900 outline-none transition-all placeholder:text-stone-400 " +
                (error
                  ? "border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                  : "border-stone-200/90 hover:border-stone-300 focus:border-amber-700 focus:ring-3 focus:ring-amber-700/15")
              }
            />
            {error && (
              <p
                role="alert"
                className="flex items-center gap-1.5 text-xs font-medium text-rose-600"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-2.5 text-xs font-medium text-emerald-900">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
            <span>Recibís +{BONO_RESENIA} puntos de bonificación por compartir tu reseña.</span>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-stone-100 pt-3">
            <button
              type="button"
              onClick={() => setReviewTrade(null)}
              className="h-11 rounded-xl border border-stone-200/90 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            >
              Omitir
            </button>
            <button
              type="submit"
              className="h-11 flex-1 rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-900 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            >
              Publicar Calificación
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
