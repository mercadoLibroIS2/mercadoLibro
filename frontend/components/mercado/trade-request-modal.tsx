"use client"

import { useEffect, useState } from "react"
import {
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  Coins,
  Loader2,
  PlusCircle,
  ShieldCheck,
  X,
} from "lucide-react"
import { useStore } from "./store"
import { isUserMatch, type TradeType } from "@/lib/mercado-types"

export function TradeRequestModal() {
  const {
    tradeModalBook,
    tradeModalInitialType,
    setTradeModalBook,
    currentUser,
    books,
    requestTradeWithPoints,
    requestDirectTrade,
    startPublishing,
  } = useStore()

  const [tradeType, setTradeType] = useState<TradeType>(
    tradeModalInitialType || "PUNTOS"
  )
  const [selectedMyBookId, setSelectedMyBookId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setTradeType(tradeModalInitialType || "PUNTOS")
    setSelectedMyBookId("")
  }, [tradeModalBook?.id, tradeModalInitialType])

  useEffect(() => {
    if (!tradeModalBook) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) {
        setTradeModalBook(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [tradeModalBook, submitting, setTradeModalBook])

  if (!tradeModalBook || !currentUser) return null

  const myAvailableBooks = books.filter(
    (b) => isUserMatch(currentUser, b.ownerId) && b.availability === "DISPONIBLE"
  )
  const canAffordPoints = currentUser.availablePoints >= tradeModalBook.points
  const canSubmit =
    !submitting &&
    (tradeType === "PUNTOS" ? canAffordPoints : Boolean(selectedMyBookId))

  async function handleSubmit() {
    if (!canSubmit || !tradeModalBook) return
    setSubmitting(true)
    try {
      const succeeded =
        tradeType === "PUNTOS"
          ? await requestTradeWithPoints(tradeModalBook.id)
          : await requestDirectTrade(tradeModalBook.id, selectedMyBookId)
      if (succeeded) {
        setTradeModalBook(null)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trade-modal-title"
      onClick={() => !submitting && setTradeModalBook(null)}
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone-200/90 bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 sm:rounded-3xl sm:p-6 sm:zoom-in-95 duration-200"
      >
        <div className="flex justify-center pb-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-stone-300" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-800 text-white">
              <ArrowRightLeft className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3
                id="trade-modal-title"
                className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-900"
              >
                Iniciar Solicitud de Trueque
              </h3>
              <p className="mt-0.5 truncate text-xs sm:text-sm text-stone-500">
                Propietario:{" "}
                <strong className="font-semibold text-stone-800">
                  {tradeModalBook.ownerName}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={() => setTradeModalBook(null)}
            aria-label="Cerrar modal de solicitud"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 overflow-y-auto pt-4">
          {/* Target Book Preview */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-stone-200/80 bg-[#faf8f5] p-3">
            {tradeModalBook.coverUrl ? (
              <img
                src={tradeModalBook.coverUrl}
                alt={`Portada de ${tradeModalBook.title}`}
                className="h-14 w-10 shrink-0 rounded-lg border border-stone-200 object-cover"
              />
            ) : (
              <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-stone-400">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-900">
                {tradeModalBook.title}
              </p>
              <p className="truncate text-xs text-stone-500">
                {tradeModalBook.author} · {tradeModalBook.condition}
              </p>
            </div>
            <div className="shrink-0 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-bold tabular-nums text-amber-900">
              {tradeModalBook.points} pts
            </div>
          </div>

          {/* Mode Tabs */}
          <div
            aria-label="Modalidad de intercambio"
            className="grid grid-cols-2 gap-1.5 rounded-xl bg-stone-100 p-1"
          >
            <button
              type="button"
              aria-pressed={tradeType === "PUNTOS"}
              onClick={() => setTradeType("PUNTOS")}
              className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 ${
                tradeType === "PUNTOS"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Coins className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <span>Por Puntos</span>
            </button>
            <button
              type="button"
              aria-pressed={tradeType === "DIRECTO"}
              onClick={() => setTradeType("DIRECTO")}
              className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 ${
                tradeType === "DIRECTO"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <ArrowRightLeft className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <span>Trueque Directo</span>
            </button>
          </div>

          {tradeType === "PUNTOS" ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-stone-200/80 bg-white p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600">Tu saldo disponible</span>
                  <span className="font-semibold tabular-nums text-stone-900">
                    {currentUser.availablePoints} pts
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-stone-600">Puntos a reservar</span>
                  <span className="font-semibold tabular-nums text-amber-800">
                    −{tradeModalBook.points} pts
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-sm">
                  <span className="font-semibold text-stone-900">Saldo restante</span>
                  <span
                    className={`font-bold tabular-nums ${
                      canAffordPoints ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {currentUser.availablePoints - tradeModalBook.points} pts
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs leading-relaxed text-emerald-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span>
                  Tus puntos quedan protegidos en garantía hasta que ambas partes confirmen el intercambio. Si rechazás o cancelás antes de completarse, se liberan automáticamente.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs sm:text-sm font-medium text-stone-700">
                Elegí uno de tus libros disponibles para ofrecer a cambio:
              </p>

              {myAvailableBooks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-[#faf8f5] p-5 text-center">
                  <BookOpen className="h-7 w-7 text-stone-400" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-stone-800">
                      No tenés libros disponibles todavía
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      Publicá un ejemplar en tu estantería para poder ofrecerlo en trueque directo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTradeModalBook(null)
                      startPublishing()
                    }}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-amber-800 px-4 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                  >
                    <PlusCircle className="h-4 w-4" aria-hidden="true" />
                    <span>Publicar un libro ahora</span>
                  </button>
                </div>
              ) : (
                <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
                  {myAvailableBooks.map((myBook) => {
                    const selected = selectedMyBookId === myBook.id
                    return (
                      <button
                        key={myBook.id}
                        type="button"
                        onClick={() => setSelectedMyBookId(myBook.id)}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 ${
                          selected
                            ? "border-amber-700 bg-amber-50/70 ring-1 ring-amber-700/20"
                            : "border-stone-200/90 bg-white hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <div className="flex h-11 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-stone-100">
                          {myBook.coverUrl ? (
                            <img
                              src={myBook.coverUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <BookOpen className="h-4 w-4 text-stone-400" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-stone-900">
                            {myBook.title}
                          </p>
                          <p className="truncate text-xs text-stone-500">
                            {myBook.condition} · {myBook.points} pts
                          </p>
                        </div>
                        <CheckCircle2
                          className={`h-5 w-5 shrink-0 transition-opacity ${
                            selected ? "text-amber-800 opacity-100" : "text-stone-300 opacity-50"
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-stone-100 pt-4">
          <button
            type="button"
            disabled={submitting}
            onClick={() => setTradeModalBook(null)}
            className="h-11 rounded-xl border border-stone-200/90 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>Enviar Solicitud</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
