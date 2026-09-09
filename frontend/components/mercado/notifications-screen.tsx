"use client"

import {
  Bell,
  CheckCheck,
  ArrowRightLeft,
  Target,
  Share2,
  Coins,
  CheckCircle2,
  XCircle,
  Archive,
} from "lucide-react"
import { useStore } from "./store"
import type { NotificationItem, NotificationType } from "@/lib/mercado-types"

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  TRADE_REQUEST: <ArrowRightLeft className="h-4 w-4 text-amber-600" />,
  TRADE_ACCEPTED: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  TRADE_REJECTED: <XCircle className="h-4 w-4 text-rose-600" />,
  TRADE_COMPLETED: <Coins className="h-4 w-4 text-amber-700" />,
  TRACKER_MATCH: <Target className="h-4 w-4 text-blue-600" />,
  CHAIN_DETECTED: <Share2 className="h-4 w-4 text-purple-600" />,
  POINTS_RECEIVED: <Coins className="h-4 w-4 text-amber-600" />,
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
    (n) => n.userId === currentUser.id && !n.archived
  )

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
    <div className="mx-auto max-w-4xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-amber-800 mb-1">
            <Bell className="h-4 w-4" />
            <span className="text-sm md:text-base font-bold uppercase tracking-wider">
              Avisos
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Notificaciones
          </h1>
        </div>

        {userNotifs.some((n) => !n.read) && (
          <button
            onClick={markAllNotificationsRead}
            className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2 text-base md:text-lg font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs self-start sm:self-auto"
          >
            <CheckCheck className="h-4 w-4 text-amber-800" />
            <span>Marcar leídas</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {userNotifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white p-8 sm:p-12 text-center">
            <Bell className="h-10 w-10 text-stone-300 mb-3" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-stone-800">
              No tenés notificaciones pendientes
            </h3>
            <p className="mt-1 text-sm md:text-base md:text-lg text-stone-500 max-w-sm">
              Cuando otros miembros soliciten tus libros o acepten intercambios, recibirás avisos acá.
            </p>
          </div>
        ) : (
          userNotifs.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleItemClick(notif)}
              className={`group flex items-start justify-between gap-3.5 rounded-2xl border p-4 sm:p-5 cursor-pointer transition-all hover:shadow-xs ${
                !notif.read
                  ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-300/40"
                  : "border-stone-200 bg-white hover:bg-stone-50/70"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-stone-200 shadow-xs mt-0.5">
                  {TYPE_ICONS[notif.type] || <Bell className="h-5 w-5 text-stone-600" />}
                </span>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base md:text-lg font-bold text-stone-900">{notif.title}</h4>
                    {!notif.read && (
                      <span className="rounded-full bg-amber-800 px-2 py-0.5 text-sm md:text-base font-bold text-white">
                        Nueva
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm md:text-base md:text-lg text-stone-700 leading-relaxed">{notif.message}</p>
                  <span className="mt-2 inline-block text-sm md:text-base text-stone-500 font-medium">
                    {new Date(notif.date).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  archiveNotification(notif.id)
                }}
                title="Archivar"
                className="rounded-xl border border-stone-200 bg-white p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0"
              >
                <Archive className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
