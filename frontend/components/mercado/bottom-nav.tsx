"use client"

import {
  Sparkles,
  ArrowRightLeft,
  Plus,
  Target,
  Bell,
} from "lucide-react"
import { useStore } from "./store"

export function BottomNav() {
  const { screen, setScreen, currentUser, trades, notifications } = useStore()

  if (!currentUser) return null

  const pendingTrades = trades.filter(
    (t) => t.ownerId === currentUser?.id && t.status === "PENDIENTE"
  ).length

  const unreadNotifs = notifications.filter(
    (n) => n.userId === currentUser?.id && !n.read && !n.archived
  ).length

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-md px-2 py-1.5 lg:hidden shadow-lg pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around">
        {/* 1. Catálogo */}
        <button
          onClick={() => setScreen("inicio")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors ${
            screen === "inicio"
              ? "text-amber-900 font-bold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <Sparkles className={`h-5 w-5 ${screen === "inicio" ? "text-amber-800" : "text-stone-400"}`} />
          <span className="text-sm md:text-base font-semibold mt-0.5">Catálogo</span>
        </button>

        {/* 2. Trueques */}
        <button
          onClick={() => setScreen("intercambios")}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors ${
            screen === "intercambios"
              ? "text-amber-900 font-bold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <ArrowRightLeft className={`h-5 w-5 ${screen === "intercambios" ? "text-amber-800" : "text-stone-400"}`} />
          <span className="text-sm md:text-base font-semibold mt-0.5">Trueques</span>
          {pendingTrades > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-amber-800 px-1 text-sm md:text-base font-bold text-white shadow-xs">
              {pendingTrades}
            </span>
          )}
        </button>

        {/* 3. Publicar (Elevated Center Button) */}
        <button
          onClick={() => setScreen("publicar")}
          className="flex flex-col items-center justify-center -mt-5"
          title="Publicar un libro"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-lg shadow-amber-900/30 transition-transform active:scale-95">
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </span>
          <span className="text-sm md:text-base font-bold text-amber-900 mt-1">Publicar</span>
        </button>

        {/* 4. Tracker */}
        <button
          onClick={() => setScreen("tracker")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors ${
            screen === "tracker"
              ? "text-amber-900 font-bold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <Target className={`h-5 w-5 ${screen === "tracker" ? "text-amber-800" : "text-stone-400"}`} />
          <span className="text-sm md:text-base font-semibold mt-0.5">Tracker</span>
        </button>

        {/* 5. Notificaciones */}
        <button
          onClick={() => setScreen("notificaciones")}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors ${
            screen === "notificaciones"
              ? "text-amber-900 font-bold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <Bell className={`h-5 w-5 ${screen === "notificaciones" ? "text-amber-800" : "text-stone-400"}`} />
          <span className="text-sm md:text-base font-semibold mt-0.5">Avisos</span>
          {unreadNotifs > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-600 px-1 text-sm md:text-base font-bold text-white shadow-xs animate-pulse">
              {unreadNotifs}
            </span>
          )}
        </button>
      </div>
    </nav>
  )
}
