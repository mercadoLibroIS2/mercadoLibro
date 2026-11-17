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
  ShieldCheck,
} from "lucide-react"
import { useStore } from "./store"
import { isUserMatch } from "@/lib/mercado-types"

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
    startPublishing,
    currentUser,
    trades,
    notifications,
    logout,
  } = useStore()

  const unreadNotifs = notifications.filter(
    (n) => isUserMatch(currentUser, n.userId) && !n.read && !n.archived
  ).length

  const pendingTrades = trades.filter(
    (t) => isUserMatch(currentUser, t.ownerId) && t.status === "PENDIENTE"
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
    ...(currentUser?.role === "ADMINISTRADOR"
      ? [{ id: "admin" as const, label: "Administración", icon: ShieldCheck, badge: null }]
      : []),
  ]

  const isVisible = isOpen !== false

  return (
    <aside
      aria-label="Navegación principal"
      className={`fixed top-0 bottom-0 left-0 z-40 hidden lg:flex w-72 flex-col justify-between border-r border-stone-200/80 bg-white p-5 transition-all duration-200 ease-out shadow-[1px_0_12px_rgba(28,25,23,0.03)] ${
        isVisible
          ? "translate-x-0 opacity-100"
          : "-translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="space-y-6">
        {/* Header with Logo + Collapse Toggle */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <button
            type="button"
            onClick={() => setScreen("inicio")}
            className="flex items-center gap-3 rounded-xl text-left transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-800 text-white shadow-sm shadow-amber-900/20">
              <BookOpen className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <span className="block font-serif text-base font-bold tracking-tight text-stone-900 leading-tight">
                MercadoLibro
              </span>
              <p className="text-xs font-medium text-stone-500">
                Comunidad de lectura
              </p>
            </div>
          </button>

          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              title="Cerrar panel lateral"
              aria-label="Cerrar panel lateral"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition-colors duration-150 hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50"
            >
              <PanelLeftClose className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={startPublishing}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-800 px-4 text-sm sm:text-[15px] font-semibold text-white shadow-sm shadow-amber-900/15 transition-all duration-150 ease-out hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <PlusCircle className="h-4.5 w-4.5" aria-hidden="true" />
          <span>Publicar un Libro</span>
        </button>

        {/* Main Navigation Links */}
        <nav className="space-y-1">
          <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-stone-400">
            Secciones
          </div>
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const isActive = screen === item.id

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setScreen(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-10 w-full items-center justify-between rounded-xl px-3 text-sm sm:text-[15px] font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 ${
                  isActive
                    ? "bg-amber-100/75 text-amber-950"
                    : "text-stone-600 hover:bg-stone-100/80 hover:text-stone-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 ${
                      isActive ? "text-amber-800" : "text-stone-400"
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section: Notifications & Logout */}
      <div className="space-y-1 border-t border-stone-100 pt-4">
        <button
          type="button"
          onClick={() => setScreen("notificaciones")}
          aria-current={screen === "notificaciones" ? "page" : undefined}
          className={`flex h-10 w-full items-center justify-between rounded-xl px-3 text-sm sm:text-[15px] font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 ${
            screen === "notificaciones"
              ? "bg-amber-100/75 text-amber-950"
              : "text-stone-600 hover:bg-stone-100/80 hover:text-stone-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <Bell
              className={`h-4.5 w-4.5 shrink-0 ${
                screen === "notificaciones" ? "text-amber-800" : "text-stone-400"
              }`}
              aria-hidden="true"
            />
            <span>Notificaciones</span>
          </div>

          {unreadNotifs > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-xs font-bold text-white">
              {unreadNotifs}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={logout}
          className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm sm:text-[15px] font-semibold text-rose-700 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0 text-rose-600" aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
