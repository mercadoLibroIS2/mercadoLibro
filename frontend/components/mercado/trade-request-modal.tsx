"use client"

import { useState } from "react"
import {
  X,
  Coins,
  ArrowRightLeft,
  BookOpen,
  ShieldCheck,
  PlusCircle,
} from "lucide-react"
import { useStore } from "./store"
import type { TradeType } from "@/lib/mercado-types"

export function TradeRequestModal() {
  const {
    tradeModalBook,
    tradeModalInitialType,
    setTradeModalBook,
    currentUser,
    books,
    requestTradeWithPoints,
    requestDirectTrade,
    setScreen,
  } = useStore()

  const [tradeType, setTradeType] = useState<TradeType>(tradeModalInitialType || "PUNTOS")
  const [selectedMyBookId, setSelectedMyBookId] = useState<string>("")

  // Update trade type when initial type changes
  if (tradeModalInitialType && tradeType !== tradeModalInitialType && !selectedMyBookId) {
    // Sync initial type on open
    setTradeType(tradeModalInitialType)
  }

  if (!tradeModalBook || !currentUser) return null

  const myAvailableBooks = books.filter(
    (b) => b.ownerId === currentUser.id && b.availability === "DISPONIBLE"
  )

  const canAffordPoints = currentUser.availablePoints >= tradeModalBook.points

  function handleSubmit() {
    if (tradeType === "PUNTOS") {
      const ok = requestTradeWithPoints(tradeModalBook!.id)
      if (ok) setTradeModalBook(null)
    } else {
      if (!selectedMyBookId) return
      const ok = requestDirectTrade(tradeModalBook!.id, selectedMyBookId)
      if (ok) setTradeModalBook(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Mobile Pull Handle */}
        <div className="flex justify-center pb-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-stone-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-800 text-white">
              <ArrowRightLeft className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
                Iniciar Solicitud de Trueque
              </h3>
              <p className="text-sm md:text-base md:text-lg text-stone-600">
                Propietario: <strong className="text-stone-800">{tradeModalBook.ownerName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setTradeModalBook(null)}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto pt-3.5">
          {/* Selected Target Book Preview */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-stone-200 bg-stone-50 p-3">
            {tradeModalBook.coverUrl ? (
              <img
                src={tradeModalBook.coverUrl}
                alt=""
                className="h-14 w-10 rounded-lg object-cover ring-1 ring-stone-200 shrink-0"
              />
            ) : (
              <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-stone-200 text-stone-500 shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm md:text-base font-bold uppercase tracking-wider text-amber-800 block">
                Libro que recibirás:
              </span>
              <p className="text-base md:text-lg font-bold text-stone-900 truncate">{tradeModalBook.title}</p>
              <p className="text-sm md:text-base md:text-lg text-stone-600 truncate">{tradeModalBook.author} • {tradeModalBook.condition}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="rounded-xl bg-amber-100 px-3 py-1 text-sm md:text-base md:text-lg font-bold text-amber-900">
                {tradeModalBook.points} pts
              </span>
            </div>
          </div>

          {/* Trade Type Selector */}
          <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl border border-stone-200 bg-stone-100 p-1.5">
            <button
              type="button"
              onClick={() => setTradeType("PUNTOS")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-base md:text-lg font-bold transition-all ${
                tradeType === "PUNTOS"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Coins className="h-4 w-4 text-amber-700" />
              Por Puntos
            </button>
            <button
              type="button"
              onClick={() => setTradeType("DIRECTO")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-base md:text-lg font-bold transition-all ${
                tradeType === "DIRECTO"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <ArrowRightLeft className="h-4 w-4 text-amber-800" />
              Trueque Directo
            </button>
          </div>

          {/* Content based on type */}
          {tradeType === "PUNTOS" ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2.5 text-base md:text-lg">
                <div className="flex justify-between text-stone-700">
                  <span>Tus puntos disponibles:</span>
                  <strong className="text-stone-900 font-bold">{currentUser.availablePoints} pts</strong>
                </div>
                <div className="flex justify-between text-amber-900 font-semibold">
                  <span>Puntos a reservar en garantía:</span>
                  <span>- {tradeModalBook.points} pts</span>
                </div>
                <div className="border-t border-amber-200 pt-2 flex justify-between text-stone-900 font-bold text-base md:text-lg">
                  <span>Saldo disponible resultante:</span>
                  <span>{currentUser.availablePoints - tradeModalBook.points} pts</span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-stone-50 border border-stone-200 p-3.5 text-sm md:text-base md:text-lg text-stone-700 leading-relaxed">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Garantía segura:</strong> Tus puntos quedan retenidos en depósito de garantía. Solo se transferirán al dueño cuando confirmes que recibiste el libro en mano.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-base md:text-lg font-bold text-stone-800">
                Seleccioná cuál de tus libros ofrecés a cambio:
              </p>

              {myAvailableBooks.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {myAvailableBooks.map((myBook) => (
                    <label
                      key={myBook.id}
                      className={`flex items-center gap-3.5 rounded-2xl border p-3 cursor-pointer transition-all ${
                        selectedMyBookId === myBook.id
                          ? "border-amber-800 bg-amber-50/70 ring-1 ring-amber-700 shadow-xs"
                          : "border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="myOfferedBook"
                        value={myBook.id}
                        checked={selectedMyBookId === myBook.id}
                        onChange={() => setSelectedMyBookId(myBook.id)}
                        className="text-amber-800 focus:ring-amber-700 h-4.5 w-4.5"
                      />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-base md:text-lg font-bold text-stone-900 truncate">{myBook.title}</p>
                        <p className="text-sm md:text-base md:text-lg text-stone-600 truncate">
                          {myBook.author} • Estado: {myBook.condition} ({myBook.points} pts)
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-center bg-stone-50/50">
                  <p className="text-base md:text-lg font-bold text-stone-800">
                    No tenés libros disponibles en tu catálogo para ofrecer
                  </p>
                  <p className="text-sm md:text-base md:text-lg text-stone-600 mt-1">
                    Publicá un libro primero o solicitá este ejemplar utilizando tus puntos.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTradeModalBook(null)
                      setScreen("publicar")
                    }}
                    className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-amber-800 px-4 py-2.5 text-base md:text-lg font-semibold text-white hover:bg-amber-900 transition-colors"
                  >
                    <PlusCircle className="h-4.5 w-4.5" />
                    Publicar un libro ahora
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-end gap-2.5 border-t border-stone-100 pt-3.5">
          <button
            type="button"
            onClick={() => setTradeModalBook(null)}
            className="rounded-xl border border-stone-200 px-4 py-2.5 text-base md:text-lg font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              tradeType === "PUNTOS"
                ? !canAffordPoints
                : !selectedMyBookId
            }
            className={`rounded-xl px-5 py-2.5 text-base md:text-lg font-bold text-white shadow-xs transition-all active:scale-95 ${
              tradeType === "PUNTOS" && !canAffordPoints
                ? "bg-stone-300 cursor-not-allowed text-stone-500"
                : tradeType === "DIRECTO" && !selectedMyBookId
                ? "bg-stone-300 cursor-not-allowed text-stone-500"
                : "bg-amber-800 hover:bg-amber-900"
            }`}
          >
            Enviar Solicitud
          </button>
        </div>
      </div>
    </div>
  )
}
