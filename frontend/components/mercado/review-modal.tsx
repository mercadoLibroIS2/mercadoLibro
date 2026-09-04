"use client"

import { useState } from "react"
import { BookOpen, Star, X, Sparkles } from "lucide-react"
import { useStore } from "./store"

export function ReviewModal() {
  const { reviewTrade, setReviewTrade, currentUser, books, addReview } = useStore()
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [comment, setComment] = useState<string>("")
  const [error, setError] = useState<string>("")

  if (!reviewTrade || !currentUser) return null

  const targetUserId =
    reviewTrade.requesterId === currentUser.id
      ? reviewTrade.ownerId
      : reviewTrade.requesterId
  const targetUserName =
    reviewTrade.requesterId === currentUser.id
      ? reviewTrade.ownerName
      : reviewTrade.requesterName

  const requestedBook = books.find((b) => b.id === reviewTrade.requestedBookId)
  const bookTitle = requestedBook?.title || "Libro intercambiado"

  function handleSubmit(e: React.FormEvent) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Mobile Pull Handle */}
        <div className="flex justify-center pb-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-stone-300" />
        </div>

        <button
          onClick={() => setReviewTrade(null)}
          className="absolute right-3.5 top-3.5 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center pt-2">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 mb-2.5">
            <Star className="h-6 w-6 fill-amber-600 text-amber-600" />
          </span>
          <h3 className="font-serif text-xl font-bold text-stone-900">
            Calificar a {targetUserName}
          </h3>
          <p className="text-sm md:text-base md:text-lg text-stone-600 mt-1">
            Tu opinión ayuda a construir confianza en la comunidad.
          </p>

          {/* Book Context Card */}
          {requestedBook && (
            <div className="mt-3.5 flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-left">
              {requestedBook.coverUrl ? (
                <img
                  src={requestedBook.coverUrl}
                  alt=""
                  className="h-12 w-9 rounded-lg object-cover ring-1 ring-stone-200 shrink-0"
                />
              ) : (
                <div className="flex h-12 w-9 items-center justify-center rounded-lg bg-stone-200 text-stone-500 shrink-0">
                  <BookOpen className="h-4 w-4" />
                </div>
              )}
              <div className="truncate flex-1">
                <span className="text-sm md:text-base font-bold text-amber-800 uppercase block">
                  Ejemplar intercambiado:
                </span>
                <p className="text-base md:text-lg font-bold text-stone-900 truncate">{requestedBook.title}</p>
                <p className="text-sm md:text-base md:text-lg text-stone-600 truncate">{requestedBook.author}</p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto">
          {/* Star selector */}
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      (hoverRating || rating) >= star
                        ? "fill-amber-500 text-amber-500"
                        : "text-stone-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-base md:text-lg font-bold text-amber-950">
              {rating === 5
                ? "Excelente experiencia (5/5)"
                : rating === 4
                ? "Muy bueno (4/5)"
                : rating === 3
                ? "Bueno (3/5)"
                : rating === 2
                ? "Regular (2/5)"
                : "Malo (1/5)"}
            </span>
          </div>

          {/* Comment text */}
          <div>
            <label className="block text-base md:text-lg font-bold text-stone-700 mb-1.5">
              Comentario sobre el trueque *
            </label>
            <textarea
              rows={3}
              required
              placeholder="¿Cómo estuvo el estado del libro, la puntualidad y el trato?..."
              value={comment}
              onChange={(e) => {
                setComment(e.target.value)
                if (error) setError("")
              }}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-base md:text-lg text-stone-900 placeholder:text-stone-400 outline-none focus:border-amber-700 focus:bg-white"
            />
            {error && <p className="mt-1 text-sm md:text-base md:text-lg font-medium text-red-600">{error}</p>}
          </div>

          {/* Bonus pill */}
          <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm md:text-base md:text-lg text-amber-950">
            <Sparkles className="h-4.5 w-4.5 text-amber-700 shrink-0" />
            <p>
              ¡Recibirás <strong>+5 puntos</strong> de bonificación por tu reseña!
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-stone-100 pt-3.5">
            <button
              type="button"
              onClick={() => setReviewTrade(null)}
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-base md:text-lg font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Omitir
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-800 px-5 py-2.5 text-base md:text-lg font-bold text-white shadow-xs hover:bg-amber-900 transition-all active:scale-95"
            >
              Publicar Calificación
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
