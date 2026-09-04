"use client"

import {
  BookOpen,
  Sparkles,
  ArrowRightLeft,
  Target,
  Share2,
  Bell,
  PlusCircle,
  LogOut,
  PanelLeftClose,
} from "lucide-react"
import { useStore } from "./store"

export function Sidebar({
  isOpen,
  onToggle,
}: {
  isOpen?: boolean
  onToggle?: () => void
}) {
  const {
    screen,
    setScreen,
    currentUser,
    trades,
    notifications,
    logout,
  } = useStore()

  const unreadNotifs = notifications.filter(
    (n) => n.userId === currentUser?.id && !n.read && !n.archived
  ).length

  const pendingTrades = trades.filter(
    (t) => t.ownerId === currentUser?.id && t.status === "PENDIENTE"
  ).length

  const mainNavItems = [
    {
      id: "inicio" as const,
      label: "Catálogo",
      icon: Sparkles,
      badge: null,
    },
    {
      id: "intercambios" as const,
      label: "Mis Intercambios",
      icon: ArrowRightLeft,
      badge: pendingTrades > 0 ? pendingTrades : null,
      badgeColor: "bg-amber-800 text-white",
    },
    {
      id: "tracker" as const,
      label: "Tracker de Libros",
      icon: Target,
      badge: null,
    },
    {
      id: "cadenas" as const,
      label: "Cadenas Circulares",
      icon: Share2,
      badge: null,
    },
  ]

  const isVisible = isOpen !== false

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-40 hidden lg:flex w-72 sm:w-80 flex-col justify-between border-r border-stone-200 bg-white p-5 transition-all duration-300 ease-in-out shadow-xs ${
        isVisible
          ? "translate-x-0 opacity-100"
          : "-translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      {/* Top Header & Main Navigation */}
      <div className="space-y-5">
        {/* Header with Logo + Collapse Toggle */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
          <button
            onClick={() => setScreen("inicio")}
            className="flex items-center gap-2.5 text-left transition-transform active:scale-95"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-800 text-white shadow-sm shadow-amber-900/20">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-stone-900">
                Mercado Libro
              </span>
              <p className="text-sm md:text-base font-medium text-stone-500">
                Comunidad de lectura
              </p>
            </div>
          </button>

          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              title="Cerrar panel lateral"
              className="flex items-center rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-800 transition-colors"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Primary Action Button: Publicar */}
        <button
          onClick={() => setScreen("publicar")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-800 py-3 text-base md:text-lg font-bold text-white shadow-sm shadow-amber-900/20 hover:bg-amber-900 transition-all active:scale-98"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          <span>Publicar un Libro</span>
        </button>

        {/* Main Navigation Links */}
        <nav className="space-y-1">
          <div className="px-2 pb-1 text-sm md:text-base font-bold uppercase tracking-wider text-stone-400">
            Secciones
          </div>
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const isActive = screen === item.id

            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-base md:text-lg font-semibold transition-all ${
                  isActive
                    ? "bg-amber-100/80 text-amber-950 shadow-xs"
                    : "text-stone-600 hover:bg-stone-100/80 hover:text-stone-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 ${
                      isActive ? "text-amber-800" : "text-stone-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-sm md:text-base font-bold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section: Notificaciones y Cerrar Sesión */}
      <div className="border-t border-stone-100 pt-3 space-y-1.5">
        {/* Notificaciones Button */}
        <button
          onClick={() => setScreen("notificaciones")}
          className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-base md:text-lg font-semibold transition-all ${
            screen === "notificaciones"
              ? "bg-amber-100/80 text-amber-950 shadow-xs"
              : "text-stone-600 hover:bg-stone-100/80 hover:text-stone-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <Bell
              className={`h-4.5 w-4.5 ${
                screen === "notificaciones" ? "text-amber-800" : "text-stone-400"
              }`}
            />
            <span>Notificaciones</span>
          </div>

          {unreadNotifs > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-sm md:text-base font-bold text-white animate-pulse">
              {unreadNotifs}
            </span>
          )}
        </button>

        {/* Cerrar Sesión Button */}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-base md:text-lg font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
        >
          <LogOut className="h-4.5 w-4.5 text-rose-500" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
