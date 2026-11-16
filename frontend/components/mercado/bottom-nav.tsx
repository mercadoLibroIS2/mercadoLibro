"use client"

import {
  Sparkles,
  ArrowRightLeft,
  Plus,
  Target,
  Bell,
} from "lucide-react"
import { useStore } from "./store"
import { isUserMatch } from "@/lib/mercado-types"

export function BottomNav() {
  const { screen, setScreen, startPublishing, currentUser, trades, notifications } = useStore()

  if (!currentUser) return null

  const pendingTrades = trades.filter(
    (t) => isUserMatch(currentUser, t.ownerId) && t.status === "PENDIENTE"
  ).length

  const unreadNotifs = notifications.filter(
    (n) => isUserMatch(currentUser, n.userId) && !n.read && !n.archived
  ).length

  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200/80 bg-white/95 backdrop-blur-md px-2 py-1.5 lg:hidden shadow-[0_-4px_20px_rgba(28,25,23,0.06)] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around">
        <button
          type="button"
          onClick={() => setScreen("inicio")}
          className={`flex min-w-[56px] flex-col items-center justify-center rounded-xl py-1 px-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 ${
            screen === "inicio"
              ? "text-amber-900 font-bold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <Sparkles className={`h-5 w-5 ${screen === "inicio" ? "text-amber-800" : "text-stone-400"}`} aria-hidden="true" />
          <span className="mt-0.5 text-[11px] font-semibold">Catálogo</span>
        </button>

        <button
          type="button"
          onClick={() => setScreen("intercambios")}
          className={`relative flex min-w-[56px] flex-col items-center justify-center rounded-xl py-1 px-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 ${
            screen === "intercambios"
              ? "text-amber-900 font-bold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <ArrowRightLeft className={`h-5 w-5 ${screen === "intercambios" ? "text-amber-800" : "text-stone-400"}`} aria-hidden="true" />
          <span className="mt-0.5 text-[11px] font-semibold">Trueques</span>
          {pendingTrades > 0 && (
            <span className="absolute top-0 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-800 px-1 text-[10px] font-bold text-white shadow-xs">
              {pendingTrades}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={startPublishing}
          className="flex flex-col items-center justify-center -mt-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 rounded-2xl px-1"
          title="Publicar un libro"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-md shadow-amber-900/25 ring-4 ring-white transition-transform duration-150 active:scale-95">
            <Plus className="h-5.5 w-5.5 stroke-[2.5]" aria-hidden="true" />
          </span>
          <span className="mt-0.5 text-[11px] font-bold text-amber-900">Publicar</span>
        </button>

        <button
          type="button"
          onClick={() => setScreen("tracker")}
          className={`flex min-w-[56px] flex-col items-center justify-center rounded-xl py-1 px-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 ${
            screen === "tracker"
              ? "text-amber-900 font-bold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <Target className={`h-5 w-5 ${screen === "tracker" ? "text-amber-800" : "text-stone-400"}`} aria-hidden="true" />
          <span className="mt-0.5 text-[11px] font-semibold">Tracker</span>
        </button>

        <button
          type="button"
          onClick={() => setScreen("notificaciones")}
          className={`relative flex min-w-[56px] flex-col items-center justify-center rounded-xl py-1 px-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 ${
            screen === "notificaciones"
              ? "text-amber-900 font-bold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <Bell className={`h-5 w-5 ${screen === "notificaciones" ? "text-amber-800" : "text-stone-400"}`} aria-hidden="true" />
          <span className="mt-0.5 text-[11px] font-semibold">Avisos</span>
          {unreadNotifs > 0 && (
            <span className="absolute top-0 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
              {unreadNotifs}
            </span>
          )}
        </button>
      </div>
    </nav>
  )
}
