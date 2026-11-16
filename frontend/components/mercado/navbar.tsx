"use client"

import { useState, useRef, useEffect } from "react"
import {
  Search,
  Coins,
  Lock,
  X,
  PanelLeftOpen,
} from "lucide-react"
import { useStore } from "./store"
import { isUserMatch } from "@/lib/mercado-types"

export function Navbar({
  sidebarOpen,
  onToggleSidebar,
}: {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}) {
  const {
    currentUser,
    screen,
    setScreen,
    books,
    searchQuery,
    setSearchQuery,
    setSelectedBookId,
    notifications,
    trades,
  } = useStore()

  const [searchFocused, setSearchFocused] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setAvatarFailed(false)
  }, [currentUser?.id, currentUser?.avatar])

  const unreadNotifs = notifications.filter(
    (n) => isUserMatch(currentUser, n.userId) && !n.read && !n.archived
  ).length

  const pendingTrades = trades.filter(
    (t) => isUserMatch(currentUser, t.ownerId) && t.status === "PENDIENTE"
  ).length

  const totalPending = unreadNotifs + pendingTrades

  // Autocomplete suggestions (RF29: >= 2 chars)
  const suggestions =
    searchQuery.trim().length >= 2
      ? books
          .filter(
            (b) =>
              b.availability === "DISPONIBLE" &&
              (b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.category.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .slice(0, 6)
      : []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-2.5 sm:gap-4 px-3 sm:px-6 lg:px-8">
        {/* Left: Button to Open Sidebar (Desktop only when closed) */}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title="Abrir panel lateral de navegación"
            aria-label="Abrir panel lateral de navegación"
            className="hidden lg:inline-flex relative h-10 items-center gap-2 rounded-xl border border-stone-200/90 bg-stone-50/80 px-3 text-stone-700 shadow-[0_1px_2px_rgba(28,25,23,0.03)] transition-all duration-150 ease-out hover:border-stone-300 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 active:scale-[0.98] shrink-0"
          >
            <PanelLeftOpen className="h-4.5 w-4.5 text-stone-700" aria-hidden="true" />
            <span className="font-serif text-sm font-bold text-stone-900">
              Menú
            </span>
            {totalPending > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-800 px-1.5 text-xs font-bold text-white">
                {totalPending}
              </span>
            )}
          </button>
        )}

        {/* Center: Search Input + Autocomplete */}
        <div ref={searchRef} className="relative flex-1 max-w-2xl">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label="Buscar libros en el catálogo"
              placeholder="Buscar título, autor o género..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (screen !== "inicio") setScreen("inicio")
                  setSearchFocused(false)
                } else if (e.key === "Escape") {
                  setSearchFocused(false)
                }
              }}
              onFocus={() => setSearchFocused(true)}
              className="h-10 sm:h-11 w-full rounded-xl border border-stone-200/90 bg-stone-50/80 pl-10 pr-9 text-sm sm:text-[15px] text-stone-900 placeholder:text-stone-400 outline-none transition-all duration-150 ease-out hover:border-stone-300 focus:border-amber-700 focus:bg-white focus:ring-3 focus:ring-amber-700/15"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {searchFocused && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-1.5 shadow-[0_14px_40px_rgba(28,25,23,0.12)] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="border-b border-stone-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
                Sugerencias en el catálogo
              </div>
              <div className="mt-1 divide-y divide-stone-100/80">
                {suggestions.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setSelectedBookId(item.id)
                      setSearchFocused(false)
                      if (screen !== "inicio") setScreen("inicio")
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-amber-50/70 focus-visible:outline-none focus-visible:bg-amber-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm sm:text-[15px] font-semibold text-stone-900">
                        {item.title}
                      </p>
                      <p className="truncate text-xs sm:text-sm text-stone-600">
                        {item.author} • <span className="font-medium text-stone-700">{item.category}</span>
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">
                      <Coins className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                      {item.points} pts
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Points Pill + Profile Button */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser && (
            <button
              type="button"
              onClick={() => setScreen("perfil")}
              title={`Saldo disponible: ${currentUser.availablePoints} pts | Retenidos en garantía: ${currentUser.reservedPoints} pts`}
              className="flex h-10 items-center gap-1.5 sm:gap-2 rounded-xl border border-amber-200/90 bg-amber-50/90 px-2.5 sm:px-3.5 text-sm font-bold text-amber-950 shadow-[0_1px_2px_rgba(28,25,23,0.03)] transition-all duration-150 ease-out hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 active:scale-[0.98]"
            >
              <div className="flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-amber-700" aria-hidden="true" />
                <span className="font-serif text-sm sm:text-base font-bold">{currentUser.availablePoints}</span>
                <span className="text-xs font-semibold text-amber-900/80">pts</span>
              </div>
              {currentUser.reservedPoints > 0 && (
                <div className="hidden sm:flex items-center gap-1 border-l border-amber-300/80 pl-2 text-xs font-medium text-stone-600">
                  <Lock className="h-3 w-3 text-stone-500" aria-hidden="true" />
                  <span className="font-bold text-stone-800">{currentUser.reservedPoints}</span>
                </div>
              )}
            </button>
          )}

          {currentUser && (
            <button
              type="button"
              onClick={() => setScreen("perfil")}
              title="Ir a mi perfil y billetera"
              className={`flex h-10 items-center gap-2 rounded-xl border p-1 sm:pr-3 transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 active:scale-[0.98] ${
                screen === "perfil"
                  ? "border-amber-400 bg-amber-100/70 text-amber-950 ring-2 ring-amber-200/70"
                  : "border-stone-200/90 bg-white text-stone-800 hover:bg-stone-50 hover:border-stone-300"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-amber-100 text-xs font-bold text-amber-900 ring-1 ring-stone-200">
                {currentUser.avatar && !avatarFailed ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    onError={() => setAvatarFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  currentUser.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="hidden md:inline text-sm font-semibold text-stone-800">
                {currentUser.name.split(" ")[0]}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
