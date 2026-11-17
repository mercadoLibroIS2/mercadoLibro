"use client"

import type { ReactNode } from "react"
import {
  Archive,
  ArrowRightLeft,
  Bell,
  CheckCheck,
  CheckCircle2,
  Coins,
  Share2,
  Target,
  XCircle,
  Flag,
} from "lucide-react"
import { useStore } from "./store"
import {
  isUserMatch,
  type NotificationItem,
  type NotificationType,
} from "@/lib/mercado-types"

const TYPE_ICONS: Record<NotificationType, ReactNode> = {
  TRADE_REQUEST: <ArrowRightLeft className="h-4 w-4 text-amber-700" aria-hidden="true" />,
  TRADE_ACCEPTED: <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />,
  TRADE_REJECTED: <XCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />,
  TRADE_COMPLETED: <Coins className="h-4 w-4 text-amber-700" aria-hidden="true" />,
  TRACKER_MATCH: <Target className="h-4 w-4 text-sky-700" aria-hidden="true" />,
  CHAIN_DETECTED: <Share2 className="h-4 w-4 text-indigo-700" aria-hidden="true" />,
  POINTS_RECEIVED: <Coins className="h-4 w-4 text-amber-700" aria-hidden="true" />,
  REPORT_UPDATE: <Flag className="h-4 w-4 text-rose-700" aria-hidden="true" />,
}

export function NotificationsScreen() {
  const {
    currentUser,
    notifications,
    markNotificationRead,
    archiveNotification,
    markAllNotificationsRead,
    setScreen,
    setSelectedBookId,
  } = useStore()

  if (!currentUser) return null

  const userNotifs = notifications.filter(
    (n) => isUserMatch(currentUser, n.userId) && !n.archived
  )
  const hasUnread = userNotifs.some((n) => !n.read)

  function handleItemClick(notif: NotificationItem) {
    markNotificationRead(notif.id)
    if (notif.linkScreen) {
      setScreen(notif.linkScreen)
    }
    if (notif.linkData?.bookId) {
      setSelectedBookId(notif.linkData.bookId)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800">
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Avisos</span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Notificaciones
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Actividad reciente de tus solicitudes, alertas del tracker y movimientos.
          </p>
        </div>

        {hasUnread && (
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="inline-flex h-10 items-center gap-2 self-start rounded-xl border border-stone-200/90 bg-white px-4 text-sm font-semibold text-stone-700 shadow-[0_1px_2px_rgba(28,25,23,0.03)] transition-colors hover:bg-stone-50 hover:text-stone-900 sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            <CheckCheck className="h-4 w-4 text-amber-800" aria-hidden="true" />
            <span>Marcar leídas</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {userNotifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300/90 bg-white p-10 text-center sm:p-14">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
              <Bell className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              No tenés notificaciones pendientes
            </h3>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-stone-500">
              Cuando otros lectores soliciten tus libros, acepten trueques o coincida un título del tracker, verás los avisos acá.
            </p>
          </div>
        ) : (
          userNotifs.map((notif) => (
            <div
              key={notif.id}
              className={`group flex items-start justify-between gap-3 rounded-2xl border p-4 transition-all sm:p-5 ${
                !notif.read
                  ? "border-amber-200/90 bg-amber-50/45 shadow-[0_1px_2px_rgba(146,64,14,0.04)]"
                  : "border-stone-200/80 bg-white hover:border-stone-300/90"
              }`}
            >
              <button
                type="button"
                onClick={() => handleItemClick(notif)}
                className="flex min-w-0 flex-1 items-start gap-3.5 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200/80 bg-white shadow-xs">
                  {TYPE_ICONS[notif.type] ?? (
                    <Bell className="h-4 w-4 text-stone-500" aria-hidden="true" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4
                      className={`text-sm sm:text-[15px] leading-snug ${
                        !notif.read
                          ? "font-semibold text-stone-900"
                          : "font-medium text-stone-800"
                      }`}
                    >
                      {notif.title}
                    </h4>
                    {!notif.read && (
                      <span
                        className="inline-flex h-2 w-2 rounded-full bg-amber-700"
                        aria-label="Sin leer"
                      />
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">
                    {notif.message}
                  </p>
                  <span className="mt-1.5 block text-xs text-stone-400">
                    {new Date(notif.date).toLocaleString("es-AR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => archiveNotification(notif.id)}
                title="Archivar"
                aria-label={`Archivar notificación: ${notif.title}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-400 opacity-100 transition-all hover:bg-stone-100 hover:text-stone-700 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
