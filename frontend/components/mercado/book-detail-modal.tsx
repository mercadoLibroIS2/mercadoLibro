"use client"

import { useState } from "react"
import {
  X,
  Coins,
  Star,
  BookOpen,
  ArrowRightLeft,
  Target,
  Trash2,
  Edit,
  Info,
} from "lucide-react"
import { useStore } from "./store"
import { evaluatePriceDeal } from "@/lib/price-evaluator"

export function BookDetailModal() {
  const {
    books,
    selectedBookId,
    setSelectedBookId,
    currentUser,
    deleteBook,
    addToTracker,
    setTradeModalBook,
    viewUserProfile,
    setScreen,
  } = useStore()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false)

  if (!selectedBookId) return null
  const book = books.find((b) => b.id === selectedBookId)
  if (!book) return null

  const isOwner = currentUser?.id === book.ownerId
  const evaluation = evaluatePriceDeal(
    book.points,
    book.category,
    book.condition,
    book.externalRating || 4.5
  )

  const isAvailable = book.availability === "DISPONIBLE"
  const canAfford = (currentUser?.availablePoints || 0) >= book.points

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Mobile Pull Handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-stone-300" />
        </div>

        {/* Close Button */}
        <button
          onClick={() => setSelectedBookId(null)}
          className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-sm backdrop-blur-sm hover:bg-white hover:text-stone-900 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-5">
            {/* Left Cover */}
            <div className="md:col-span-2 relative aspect-[16/10] md:aspect-auto w-full bg-stone-100 flex items-center justify-center overflow-hidden">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <BookOpen className="h-14 w-14 text-stone-300" />
              )}

              <div className="absolute left-3 top-3">
                <span className="rounded-full bg-stone-900/80 px-2.5 py-0.5 text-sm md:text-base font-semibold text-white backdrop-blur-sm">
                  {book.category}
                </span>
              </div>
            </div>

            {/* Right Information & Actions */}
            <div className="md:col-span-3 flex flex-col p-4 sm:p-6">
              {/* Title & Author */}
              <div>
                <h2 className="font-serif text-xl sm:text-3xl font-bold text-stone-900 leading-tight">
                  {book.title}
                </h2>
                <p className="text-base md:text-lg font-medium text-stone-600 mt-1">de {book.author}</p>
              </div>

              {/* Attributes */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-sm md:text-base md:text-lg font-semibold text-stone-800">
                  Estado: {book.condition}
                </span>
                {book.isbn && (
                  <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-sm md:text-base md:text-lg text-stone-600 font-mono">
                    ISBN: {book.isbn}
                  </span>
                )}
              </div>

              {/* Price & Semáforo */}
              <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm md:text-base font-bold uppercase tracking-wider text-stone-500">
                      Valor de Intercambio
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Coins className="h-5 w-5 text-amber-700" />
                      <span className="font-serif text-2xl sm:text-3xl font-bold text-amber-900">
                        {book.points} pts
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm md:text-base md:text-lg font-bold transition-transform active:scale-95 ${
                      evaluation.deal === "green"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : evaluation.deal === "yellow"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        evaluation.deal === "green"
                          ? "bg-emerald-500"
                          : evaluation.deal === "yellow"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />
                    <span>{evaluation.label}</span>
                    <Info className="h-3.5 w-3.5 ml-0.5 opacity-70" />
                  </div>
                </div>

                {showPriceBreakdown && (
                  <div className="mt-3 pt-3 border-t border-stone-200 text-sm md:text-base md:text-lg text-stone-600 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Valor de referencia sugerido:</span>
                      <strong className="text-stone-800">{evaluation.referencePrice} pts</strong>
                    </div>
                    <p className="mt-1 text-sm md:text-base md:text-lg text-stone-600 italic bg-white p-2.5 rounded-xl border border-stone-200">
                      {evaluation.hint}
                    </p>
                  </div>
                )}
              </div>

              {/* Owner Info */}
              <div className="mt-3.5 rounded-2xl border border-stone-200 p-3 flex items-center justify-between">
                <div
                  onClick={() => {
                    setSelectedBookId(null)
                    viewUserProfile(book.ownerId)
                  }}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-800 font-serif font-bold text-white text-base">
                    {book.ownerName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-base md:text-lg font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
                        {book.ownerName}
                      </p>
                      {isOwner && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-sm md:text-base font-semibold text-amber-800">
                          Vos
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm md:text-base text-stone-500">
                      <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {book.ownerRating.toFixed(1)}
                      </span>
                      <span>•</span>
                      <span>{book.ownerTrades} trueques</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBookId(null)
                    viewUserProfile(book.ownerId)
                  }}
                  className="rounded-xl border border-stone-200 px-3 py-1.5 text-sm md:text-base md:text-lg font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  Ver Perfil
                </button>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col gap-2">
                {isOwner ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedBookId(null)
                        setScreen("publicar")
                      }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-base md:text-lg font-semibold text-white hover:bg-stone-800 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Modificar Publicación
                    </button>

                    {confirmDelete ? (
                      <button
                        onClick={() => {
                          deleteBook(book.id)
                          setSelectedBookId(null)
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-3 text-base md:text-lg font-semibold text-white hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        ¿Confirmar?
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 py-3 text-base md:text-lg font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    )}
                  </div>
                ) : isAvailable ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        onClick={() => {
                          setSelectedBookId(null)
                          setTradeModalBook(book, "PUNTOS")
                        }}
                        disabled={!canAfford}
                        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-base md:text-lg font-bold shadow-sm transition-all active:scale-95 ${
                          canAfford
                            ? "bg-amber-800 text-white hover:bg-amber-900"
                            : "bg-stone-200 text-stone-400 cursor-not-allowed"
                        }`}
                      >
                        <Coins className="h-4.5 w-4.5" />
                        Solicitar ({book.points} pts)
                      </button>

                      <button
                        onClick={() => {
                          setSelectedBookId(null)
                          setTradeModalBook(book, "DIRECTO")
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl border border-amber-800 bg-amber-50/60 px-4 py-3 text-base md:text-lg font-bold text-amber-950 hover:bg-amber-100 transition-colors active:scale-95"
                      >
                        <ArrowRightLeft className="h-4.5 w-4.5 text-amber-800" />
                        Trueque Directo
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        addToTracker({
                          title: book.title,
                          author: book.author,
                          category: book.category,
                          maxPoints: book.points,
                          acceptableConditions: [book.condition],
                          privateNotes: `Seguimiento iniciado desde ${book.title}`,
                        })
                        setSelectedBookId(null)
                      }}
                      className="flex items-center justify-center gap-1.5 text-sm md:text-base md:text-lg font-semibold text-stone-500 hover:text-stone-800 py-1 transition-colors"
                    >
                      <Target className="h-4 w-4" />
                      Agregar al Tracker de Libros
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl bg-stone-100 p-3 text-center text-base md:text-lg font-semibold text-stone-600">
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
