"use client"

import { useEffect, useState } from "react"
import {
  ArrowRightLeft,
  BookOpen,
  Coins,
  Edit,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trash2,
  X,
  Flag,
} from "lucide-react"
import { useStore } from "./store"
import { evaluatePriceDeal } from "@/lib/price-evaluator"
import { isUserMatch } from "@/lib/mercado-types"

const DEAL_PILLS = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  yellow: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-rose-200 bg-rose-50 text-rose-800",
} as const

export function BookDetailModal() {
  const {
    books,
    selectedBookId,
    setSelectedBookId,
    startEditingBook,
    currentUser,
    deleteBook,
    addToTracker,
    setTradeModalBook,
    viewUserProfile,
    setReportTarget,
  } = useStore()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const book = books.find((b) => b.id === selectedBookId)

  useEffect(() => {
    setConfirmDelete(false)
    setImgFailed(false)
  }, [selectedBookId])

  useEffect(() => {
    if (!book) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedBookId(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [book, setSelectedBookId])

  if (!book || !currentUser) return null

  const isOwner = isUserMatch(currentUser, book.ownerId)
  const isAvailable = book.availability === "DISPONIBLE"
  const dealInfo = evaluatePriceDeal(
    book.points,
    book.category,
    book.condition,
    book.externalRating,
    book.referencePrice,
    book.pages
  )
  const canAfford = currentUser.availablePoints >= book.points

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-detail-title"
      onClick={() => setSelectedBookId(null)}
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-stone-200/90 bg-white shadow-2xl animate-in slide-in-from-bottom-4 sm:rounded-3xl sm:zoom-in-95 duration-200"
      >
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-stone-300" aria-hidden="true" />
        </div>

        <button
          type="button"
          onClick={() => setSelectedBookId(null)}
          aria-label="Cerrar detalle del libro"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-stone-200/80 bg-white/95 text-stone-500 shadow-xs transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="overflow-y-auto p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Cover column */}
            <div className="md:col-span-5 flex flex-col gap-3">
              {/* En mobile la portada es chica para que título y acciones queden a la vista */}
              <div className="relative mx-auto aspect-[3/4] w-32 overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-100 shadow-sm sm:w-full">
                {book.coverUrl && !imgFailed ? (
                  <img
                    src={book.coverUrl}
                    alt={`Portada de ${book.title}`}
                    onError={() => setImgFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-stone-100 to-amber-50/60 p-6 text-center text-stone-400">
                    <BookOpen className="h-10 w-10" aria-hidden="true" />
                    <span className="text-xs font-medium text-stone-500">
                      Sin portada disponible
                    </span>
                  </div>
                )}

                {book.availability !== "DISPONIBLE" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-900/55 backdrop-blur-[2px]">
                    <span className="rounded-xl bg-white/95 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-stone-900 shadow-sm">
                      {book.availability}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-stone-200/80 bg-[#faf8f5] px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    Valor solicitado
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xl font-bold tabular-nums text-stone-900">
                    <Coins className="h-5 w-5 text-amber-700" aria-hidden="true" />
                    <span>{book.points} pts</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium text-stone-500">Referencia</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-stone-700">
                    {dealInfo.referencePrice} pts
                  </p>
                </div>
              </div>
            </div>

            {/* Info column */}
            <div className="md:col-span-7 flex flex-col justify-between gap-5">
              <div className="flex flex-col gap-4 pr-0 md:pr-8">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-stone-200/80 bg-stone-100/80 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                      {book.category}
                    </span>
                    <span className="rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                      {book.condition}
                    </span>
                  </div>

                  <h2
                    id="book-detail-title"
                    className="mt-2.5 font-serif text-2xl font-bold leading-tight tracking-tight text-stone-900 sm:text-[26px]"
                  >
                    {book.title}
                  </h2>
                  <p className="mt-1 text-sm sm:text-[15px] font-medium text-stone-600">
                    por {book.author}
                  </p>
                </div>

                {/* Metadata pills */}
                <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-stone-200/80 bg-[#faf8f5] p-3 text-xs">
                  <div>
                    <span className="text-stone-500">ISBN: </span>
                    <p className="mt-0.5 truncate font-mono font-semibold text-stone-800">
                      {book.isbn || "No especificado"}
                    </p>
                  </div>
                  <div>
                    <span className="text-stone-500">Valoración externa</span>
                    {typeof book.externalRating === "number" ? (
                      <p className="mt-0.5 flex items-center gap-1 font-semibold text-stone-800 tabular-nums">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                        <span>{book.externalRating.toFixed(1)} / 5.0</span>
                      </p>
                    ) : (
                      <p className="mt-0.5 font-semibold text-stone-500">Sin datos</p>
                    )}
                  </div>
                </div>

                {/* Semáforo summary */}
                <div
                  className={`flex items-start gap-2.5 rounded-xl border p-3.5 ${DEAL_PILLS[dealInfo.deal]}`}
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{dealInfo.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed opacity-90">
                      {dealInfo.hint}
                    </p>
                  </div>
                </div>

                {book.description && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Notas del ejemplar
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
                      {book.description}
                    </p>
                  </div>
                )}

                {/* Owner card */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200/80 bg-white p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-900">
                      {book.ownerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-900">
                        {book.ownerName}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-stone-500">
                        <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700 tabular-nums">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                          {book.ownerRating > 0 ? book.ownerRating.toFixed(1) : "Sin reseñas"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBookId(null)
                      viewUserProfile(book.ownerId)
                    }}
                    className="h-9 shrink-0 rounded-lg border border-stone-200/90 bg-white px-3 text-xs sm:text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                  >
                    Ver Perfil
                  </button>
                </div>
              </div>

              {/* Action Footer */}
              <div className="border-t border-stone-100 pt-4">
                {!isOwner && currentUser && book.id.split("|").length === 3 && (
                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const [isbn, ownerEmail, publicationTime] = book.id.split("|")
                        setSelectedBookId(null)
                        setReportTarget({
                          type: "PUBLICACION",
                          label: `"${book.title}" publicado por ${book.ownerName}`,
                          reportedEmail: ownerEmail,
                          isbn,
                          publicationTime,
                        })
                      }}
                      className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-stone-400 hover:text-rose-700 transition-colors"
                    >
                      <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                      Reportar publicación
                    </button>
                  </div>
                )}
                {isOwner ? (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => startEditingBook(book.id)}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-stone-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                    >
                      <Edit className="h-4 w-4" aria-hidden="true" />
                      <span>Modificar Publicación</span>
                    </button>

                    {confirmDelete ? (
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={async () => {
                          setDeleting(true)
                          try {
                            if (await deleteBook(book.id)) {
                              setSelectedBookId(null)
                            }
                          } finally {
                            setDeleting(false)
                          }
                        }}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span>¿Confirmar?</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                ) : isAvailable ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBookId(null)
                          setTradeModalBook(book, "PUNTOS")
                        }}
                        disabled={!canAfford}
                        className={`flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 ${
                          canAfford
                            ? "bg-amber-800 text-white hover:bg-amber-900"
                            : "cursor-not-allowed bg-stone-100 text-stone-400"
                        }`}
                      >
                        <Coins className="h-4 w-4" aria-hidden="true" />
                        <span>Solicitar ({book.points} pts)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBookId(null)
                          setTradeModalBook(book, "DIRECTO")
                        }}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-800/30 bg-amber-50/80 px-4 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-100 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                      >
                        <ArrowRightLeft className="h-4 w-4 text-amber-800" aria-hidden="true" />
                        <span>Trueque Directo</span>
                      </button>
                    </div>

                    {!canAfford && (
                      <p className="flex items-center justify-center gap-1.5 text-xs text-stone-500">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                        <span>
                          Te faltan {book.points - currentUser.availablePoints} pts para solicitar por puntos; podés proponer un Trueque Directo.
                        </span>
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await addToTracker({ isbn: book.isbn, title: book.title, author: book.author })
                        if (ok) setSelectedBookId(null)
                      }}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs sm:text-sm font-medium text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                    >
                      <Target className="h-4 w-4" aria-hidden="true" />
                      <span>Agregar al Tracker de Libros</span>
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-stone-200/80 bg-stone-50 px-4 py-3 text-center text-sm font-semibold text-stone-600">
                    Publicación reservada o intercambiada.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
