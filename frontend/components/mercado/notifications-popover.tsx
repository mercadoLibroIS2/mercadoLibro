"use client"

import { useRef, useEffect } from "react"
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
  TRADE_ACCEPTED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  TRADE_REJECTED: <XCircle className="h-4 w-4 text-red-600" />,
  TRADE_COMPLETED: <Coins className="h-4 w-4 text-amber-700" />,
  TRACKER_MATCH: <Target className="h-4 w-4 text-blue-600" />,
  CHAIN_DETECTED: <Share2 className="h-4 w-4 text-purple-600" />,
  POINTS_RECEIVED: <Coins className="h-4 w-4 text-amber-600" />,
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

  const popoverRef = useRef<HTMLDivElement>(null)

  const userNotifs = notifications.filter(
    (n) => n.userId === currentUser?.id && !n.archived
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

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
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4.5 w-4.5 text-amber-800" />
          <h3 className="font-serif text-base font-bold text-stone-900">Notificaciones</h3>
        </div>
        {userNotifs.some((n) => !n.read) && (
          <button
            onClick={markAllNotificationsRead}
            className="flex items-center gap-1 text-sm md:text-base font-bold text-amber-800 hover:text-amber-900"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
        {userNotifs.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            <Bell className="mx-auto h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm md:text-base md:text-lg font-medium">No tenés notificaciones pendientes</p>
          </div>
        ) : (
          userNotifs.map((notif) => (
            <div
              key={notif.id}
              className={`group flex items-start gap-3 p-3.5 text-left transition-colors hover:bg-amber-50/50 ${
                !notif.read ? "bg-amber-50/20" : ""
              }`}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100">
                {TYPE_ICONS[notif.type] || <Bell className="h-4 w-4" />}
              </span>

              <div
                onClick={() => handleItemClick(notif)}
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <p className="text-base md:text-lg font-bold text-stone-900">{notif.title}</p>
                  {!notif.read && (
                    <span className="h-2 w-2 rounded-full bg-amber-700" />
                  )}
                </div>
                <p className="mt-0.5 text-sm md:text-base md:text-lg text-stone-600 line-clamp-2">{notif.message}</p>
                <span className="mt-1 block text-sm md:text-base text-stone-400 font-medium">
                  {new Date(notif.date).toLocaleDateString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  archiveNotification(notif.id)
                }}
                title="Archivar notificación"
                className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-400 hover:text-stone-700 transition-opacity"
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
