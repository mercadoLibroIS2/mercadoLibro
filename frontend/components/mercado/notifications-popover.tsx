"use client"

import { useEffect, type ReactNode } from "react"
import {
  Archive,
  ArrowRightLeft,
  Bell,
  CheckCheck,
  CheckCircle2,
  Coins,
  Share2,
  Target,
  X,
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

export function NotificationsPopover({ onClose }: { onClose: () => void }) {
  const {
    currentUser,
    notifications,
    markNotificationRead,
    archiveNotification,
    markAllNotificationsRead,
    setScreen,
    setSelectedBookId,
  } = useStore()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  if (!currentUser) return null

  const userNotifs = notifications.filter(
    (n) => isUserMatch(currentUser, n.userId) && !n.archived
  )

  function handleItemClick(notif: NotificationItem) {
    markNotificationRead(notif.id)
    if (notif.linkScreen) {
      setScreen(notif.linkScreen)
    }
    if (notif.linkData?.bookId) {
      setSelectedBookId(notif.linkData.bookId)
    }
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-label="Notificaciones"
      className="fixed inset-x-3 top-16 z-50 flex max-h-[82vh] flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 animate-in fade-in duration-150"
    >
      <div className="flex items-center justify-between border-b border-stone-100 bg-[#faf8f5] px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-800" aria-hidden="true" />
          <h4 className="font-serif text-sm font-bold text-stone-900">
            Notificaciones
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {userNotifs.some((n) => !n.read) && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Marcar leídas</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar notificaciones"
            className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-200/70 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex-1 divide-y divide-stone-100 overflow-y-auto">
        {userNotifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Bell className="mb-2 h-8 w-8 text-stone-300" aria-hidden="true" />
            <p className="text-sm font-medium text-stone-600">
              No tenés notificaciones pendientes
            </p>
          </div>
        ) : (
          userNotifs.map((notif) => (
            <div
              key={notif.id}
              className={`group flex items-start justify-between gap-2 p-3.5 transition-colors hover:bg-stone-50 ${
                !notif.read ? "bg-amber-50/40" : "bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => handleItemClick(notif)}
                className="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-stone-200/80 bg-white">
                  {TYPE_ICONS[notif.type] ?? (
                    <Bell className="h-4 w-4 text-stone-500" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs sm:text-sm leading-snug ${
                      !notif.read
                        ? "font-semibold text-stone-900"
                        : "font-medium text-stone-700"
                    }`}
                  >
                    {notif.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-stone-500">
                    {notif.message}
                  </p>
                  <span className="mt-1 block text-[11px] text-stone-400">
                    {new Date(notif.date).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => archiveNotification(notif.id)}
                title="Archivar"
                aria-label={`Archivar: ${notif.title}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-stone-400 opacity-100 transition-opacity hover:bg-stone-200/70 hover:text-stone-700 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
