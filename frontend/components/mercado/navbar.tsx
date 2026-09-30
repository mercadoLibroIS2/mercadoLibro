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
  const searchRef = useRef<HTMLDivElement>(null)

  const unreadNotifs = notifications.filter(
    (n) => n.userId === currentUser?.id && !n.read && !n.archived
  ).length

  const pendingTrades = trades.filter(
    (t) => t.ownerId === currentUser?.id && t.status === "PENDIENTE"
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
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-md">
      <div className="flex h-16 sm:h-18 items-center justify-between gap-2.5 sm:gap-4 px-3 sm:px-6 lg:px-8">
        {/* Left: Button to Open Sidebar (Desktop Only when sidebar is closed) */}
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            title="Abrir panel lateral de navegación"
            className="hidden lg:flex relative items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/80 px-3.5 py-2 text-stone-700 hover:border-stone-300 hover:bg-stone-100 transition-all active:scale-95 shrink-0 shadow-xs animate-in fade-in duration-200"
          >
            <PanelLeftOpen className="h-5 w-5 text-stone-800" />
            <span className="font-serif text-base md:text-lg font-bold text-stone-900">
              Menú
            </span>
            {totalPending > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-800 px-1.5 text-sm md:text-base font-bold text-white">
                {totalPending}
              </span>
            )}
          </button>
        )}

        {/* Center: Buscador en Grande */}
        <div ref={searchRef} className="relative flex-1 max-w-3xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 sm:left-4 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar título, autor o género..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (screen !== "inicio") setScreen("inicio")
                  setSearchFocused(false)
                }
              }}
              onFocus={() => setSearchFocused(true)}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/90 py-2.5 sm:py-3 pl-10 sm:pl-12 pr-9 sm:pr-11 text-base md:text-lg text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:border-amber-700 focus:bg-white focus:ring-4 focus:ring-amber-100/70 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {searchFocused && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 text-sm md:text-base font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100">
                Sugerencias en el catálogo
              </div>
              <div className="mt-1 divide-y divide-stone-50">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedBookId(item.id)
                      setSearchFocused(false)
                      if (screen !== "inicio") setScreen("inicio")
                    }}
                    className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-amber-50/70 transition-colors"
                  >
                    <div className="truncate pr-2">
                      <p className="text-base md:text-lg font-bold text-stone-900 truncate">{item.title}</p>
                      <p className="text-sm md:text-base md:text-lg text-stone-600 truncate">
                        {item.author} • <span className="font-semibold text-stone-700">{item.category}</span>
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-sm md:text-base md:text-lg font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg shrink-0">
                      <Coins className="h-4 w-4 text-amber-700" />
                      {item.points} pts
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Puntos + Botón Directo al Perfil */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Puntos Pill */}
          {currentUser && (
            <div
              onClick={() => setScreen("perfil")}
              title={`Saldo disponible: ${currentUser.availablePoints} pts | Retenidos en garantía: ${currentUser.reservedPoints} pts`}
              className="flex items-center gap-1.5 sm:gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/90 px-3 sm:px-4 py-2 sm:py-2.5 text-base md:text-lg font-bold text-amber-950 cursor-pointer hover:bg-amber-100 transition-colors shadow-xs"
            >
              <div className="flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-amber-700" />
                <span className="font-serif text-base md:text-lg font-extrabold">{currentUser.availablePoints}</span>
                <span className="text-sm md:text-base font-semibold text-amber-900/80">pts</span>
              </div>
              {currentUser.reservedPoints > 0 && (
                <div className="flex items-center gap-1 border-l border-amber-300 pl-2 text-sm md:text-base font-medium text-stone-600">
                  <Lock className="h-3.5 w-3.5 text-stone-500" />
                  <span className="font-bold text-stone-800">{currentUser.reservedPoints}</span>
                </div>
              )}
            </div>
          )}

          {/* Profile Direct Button */}
          {currentUser && (
            <button
              onClick={() => setScreen("perfil")}
              title="Ir a mi perfil y billetera"
              className={`flex items-center gap-2 rounded-2xl border p-1 sm:p-1.5 sm:pr-3 transition-all active:scale-95 shadow-xs ${
                screen === "perfil"
                  ? "border-amber-400 bg-amber-100/70 text-amber-950 ring-2 ring-amber-200"
                  : "border-stone-200 bg-stone-50/80 text-stone-800 hover:bg-stone-100 hover:border-stone-300"
              }`}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="h-8 w-8 rounded-xl object-cover ring-1 ring-stone-200"
              />
              <span className="hidden md:inline text-base md:text-lg font-bold">
                {currentUser.name.split(" ")[0]}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
