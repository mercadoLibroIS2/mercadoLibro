"use client"

import { useState } from "react"
import {
  ArrowRightLeft,
  CheckCircle,
  Clock,
  Coins,
  BookOpen,
  Star,
  Share2,
  CheckCheck,
  Inbox,
  Send,
  History as HistoryIcon,
} from "lucide-react"
import { useStore } from "./store"
import { ChainsView } from "./chains-view"
import type { TradeRequest } from "@/lib/mercado-types"

type TradeTab = "recibidas" | "enviadas" | "en_curso" | "historial" | "cadenas"

export function TradesScreen() {
  const {
    trades,
    currentUser,
    books,
    acceptTrade,
    rejectTrade,
    cancelTrade,
    confirmTradeReceipt,
    setReviewTrade,
    setSelectedBookId,
    viewUserProfile,
  } = useStore()

  const [activeTab, setActiveTab] = useState<TradeTab>("recibidas")

  if (!currentUser) return null

  const receivedRequests = trades.filter(
    (t) => t.ownerId === currentUser.id && t.status === "PENDIENTE"
  )
  const sentRequests = trades.filter(
    (t) => t.requesterId === currentUser.id && t.status === "PENDIENTE"
  )
  const ongoingTrades = trades.filter(
    (t) =>
      (t.ownerId === currentUser.id || t.requesterId === currentUser.id) &&
      t.status === "ACEPTADO"
  )
  const historyTrades = trades.filter(
    (t) =>
      (t.ownerId === currentUser.id || t.requesterId === currentUser.id) &&
      (t.status === "COMPLETADO" || t.status === "RECHAZADO" || t.status === "CANCELADO")
  )

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-x-hidden">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-1.5 text-amber-800 mb-1">
          <ArrowRightLeft className="h-4 w-4" />
          <span className="text-sm md:text-base font-bold uppercase tracking-wider">
            Gestión de Trueques
          </span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
          Mis Intercambios
        </h1>
      </div>

      {/* Tabs Pills */}
      <div className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <TabPill
          active={activeTab === "recibidas"}
          onClick={() => setActiveTab("recibidas")}
          count={receivedRequests.length}
          label="Recibidas"
          icon={Inbox}
        />
        <TabPill
          active={activeTab === "enviadas"}
          onClick={() => setActiveTab("enviadas")}
          count={sentRequests.length}
          label="Enviadas"
          icon={Send}
        />
        <TabPill
          active={activeTab === "en_curso"}
          onClick={() => setActiveTab("en_curso")}
          count={ongoingTrades.length}
          label="En Curso"
          icon={Clock}
        />
        <TabPill
          active={activeTab === "historial"}
          onClick={() => setActiveTab("historial")}
          count={historyTrades.length}
          label="Historial"
          icon={HistoryIcon}
        />
        <TabPill
          active={activeTab === "cadenas"}
          onClick={() => setActiveTab("cadenas")}
          label="Cadenas"
          icon={Share2}
        />
      </div>

      {/* Tab Content */}
      <div className="mt-3 sm:mt-6">
        {activeTab === "recibidas" && (
          <TradeList
            trades={receivedRequests}
            emptyMessage="No tenés solicitudes recibidas pendientes."
            type="received"
            onAccept={acceptTrade}
            onReject={rejectTrade}
            onBookClick={setSelectedBookId}
            onUserClick={viewUserProfile}
          />
        )}

        {activeTab === "enviadas" && (
          <TradeList
            trades={sentRequests}
            emptyMessage="No tenés solicitudes enviadas pendientes."
            type="sent"
            onCancel={cancelTrade}
            onBookClick={setSelectedBookId}
            onUserClick={viewUserProfile}
          />
        )}

        {activeTab === "en_curso" && (
          <TradeList
            trades={ongoingTrades}
            emptyMessage="No tenés intercambios en curso en este momento."
            type="ongoing"
            currentUserId={currentUser.id}
            onConfirmReceipt={confirmTradeReceipt}
            onCancel={cancelTrade}
            onBookClick={setSelectedBookId}
            onUserClick={viewUserProfile}
          />
        )}

        {activeTab === "historial" && (
          <TradeList
            trades={historyTrades}
            emptyMessage="Aún no contás con intercambios finalizados."
            type="history"
            currentUserId={currentUser.id}
            onReviewClick={(trade) => setReviewTrade(trade)}
            onBookClick={setSelectedBookId}
            onUserClick={viewUserProfile}
          />
        )}

        {activeTab === "cadenas" && <ChainsView />}
      </div>
    </div>
  )
}

function TabPill({
  active,
  onClick,
  count,
  label,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  count?: number
  label: string
  icon: typeof Inbox
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-base md:text-lg font-bold whitespace-nowrap transition-all ${
        active
          ? "bg-amber-800 text-white shadow-xs"
          : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-white" : "text-stone-400"}`} />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-sm md:text-base font-bold ${
            active ? "bg-white text-amber-900" : "bg-amber-800 text-white"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function renderOngoingAction(
  trade: TradeRequest,
  isRequester: boolean,
  isOwner: boolean,
  onConfirmReceipt?: (id: string) => void
) {
  if (trade.type === "PUNTOS") {
    if (isRequester) {
      return (
        <button
          onClick={() => onConfirmReceipt && onConfirmReceipt(trade.id)}
          className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-base md:text-lg font-bold text-white shadow-xs hover:bg-emerald-800 transition-all active:scale-95"
        >
          <CheckCheck className="h-4.5 w-4.5" />
          <span>Confirmar Recepción (+10 pts)</span>
        </button>
      )
    }
    if (trade.ownerConfirmed) {
      return (
        <span className="flex items-center gap-2 text-base md:text-lg font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
          <CheckCircle className="h-4.5 w-4.5" />
          Entrega registrada (Esperando recepción del comprador)
        </span>
      )
    }
    return (
      <button
        onClick={() => onConfirmReceipt && onConfirmReceipt(trade.id)}
        className="flex items-center gap-2 rounded-xl bg-amber-800 px-4 py-2.5 text-base md:text-lg font-bold text-white shadow-xs hover:bg-amber-900 transition-all active:scale-95"
      >
        <CheckCheck className="h-4.5 w-4.5" />
        <span>Confirmar Entrega del Libro</span>
      </button>
    )
  }

  // Direct trade
  if ((isRequester && trade.requesterConfirmed) || (isOwner && trade.ownerConfirmed)) {
    return (
      <span className="flex items-center gap-2 text-base md:text-lg font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
        <CheckCircle className="h-4.5 w-4.5" />
        Tu recepción está confirmada (Esperando a la otra parte)
      </span>
    )
  }

  return (
    <button
      onClick={() => onConfirmReceipt && onConfirmReceipt(trade.id)}
      className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-base md:text-lg font-bold text-white shadow-xs hover:bg-emerald-800 transition-all active:scale-95"
    >
      <CheckCheck className="h-4.5 w-4.5" />
      <span>Confirmar Recepción de Libro (+5 pts)</span>
    </button>
  )
}

function TradeList({
  trades,
  emptyMessage,
  type,
  currentUserId,
  onAccept,
  onReject,
  onCancel,
  onConfirmReceipt,
  onReviewClick,
  onBookClick,
  onUserClick,
}: {
  trades: TradeRequest[]
  emptyMessage: string
  type: "received" | "sent" | "ongoing" | "history"
  currentUserId?: string
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
  onCancel?: (id: string) => void
  onConfirmReceipt?: (id: string) => void
  onReviewClick?: (trade: TradeRequest) => void
  onBookClick: (id: string) => void
  onUserClick: (id: string) => void
}) {
  const { books } = useStore()
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white p-8 sm:p-12 text-center">
        <ArrowRightLeft className="h-10 w-10 text-stone-300 mb-3" />
        <p className="font-serif text-base sm:text-lg font-bold text-stone-800">{emptyMessage}</p>
        <p className="mt-1 text-sm md:text-base md:text-lg text-stone-500 max-w-sm">
          Explorá el catálogo para descubrir libros o publicá ejemplares para intercambiar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {trades.map((trade) => {
        const requestedBook = books.find((b) => b.id === trade.requestedBookId)
        const offeredBook = trade.offeredBookId ? books.find((b) => b.id === trade.offeredBookId) : null
        const isRequester = currentUserId === trade.requesterId
        const isOwner = currentUserId === trade.ownerId
        const hasReviewed = isRequester ? trade.reviewedByRequester : trade.reviewedByOwner

        return (
          <div
            key={trade.id}
            className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs"
          >
            {/* Top Meta */}
            <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3 text-sm md:text-base md:text-lg">
              <span
                className={`rounded-lg px-3 py-1 text-sm md:text-base md:text-lg font-bold uppercase tracking-wider ${
                  trade.type === "PUNTOS"
                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                    : "bg-blue-100 text-blue-900 border border-blue-200"
                }`}
              >
                {trade.type === "PUNTOS" ? "Por Puntos" : "Directo"}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-sm md:text-base md:text-lg font-bold ${
                  trade.status === "PENDIENTE"
                    ? "bg-amber-100 text-amber-800"
                    : trade.status === "ACEPTADO"
                    ? "bg-emerald-100 text-emerald-800"
                    : trade.status === "COMPLETADO"
                    ? "bg-stone-900 text-white"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {trade.status === "ACEPTADO" ? "EN CURSO" : trade.status}
              </span>
            </div>

            {/* Exchange Summary Grid */}
            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Requested Book */}
              <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-3">
                {requestedBook?.coverUrl ? (
                  <img
                    src={requestedBook.coverUrl}
                    alt=""
                    className="h-14 w-10 rounded-lg object-cover ring-1 ring-stone-200 shrink-0 cursor-pointer"
                    onClick={() => onBookClick(requestedBook.id)}
                  />
                ) : (
                  <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-stone-200 text-stone-500 shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </div>
                )}
                <div className="truncate flex-1">
                  <span className="text-sm md:text-base font-bold text-amber-800 uppercase block">
                    Libro Solicitado:
                  </span>
                  <p
                    onClick={() => requestedBook && onBookClick(requestedBook.id)}
                    className="text-base md:text-lg font-bold text-stone-900 truncate hover:text-amber-900 cursor-pointer"
                  >
                    {requestedBook?.title || "Libro"}
                  </p>
                  <p
                    onClick={() => onUserClick(trade.ownerId)}
                    className="text-sm md:text-base md:text-lg text-stone-600 truncate hover:underline cursor-pointer"
                  >
                    Dueño: {trade.ownerName}
                  </p>
                </div>
              </div>

              {/* Offered Element */}
              <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-3">
                {trade.type === "PUNTOS" ? (
                  <>
                    <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800 shrink-0">
                      <Coins className="h-6 w-6" />
                    </div>
                    <div className="truncate flex-1">
                      <span className="text-sm md:text-base font-bold text-amber-800 uppercase block">
                        Contraprestación:
                      </span>
                      <p className="text-base md:text-lg font-bold text-amber-950 truncate">
                        {trade.points} Puntos en Garantía
                      </p>
                      <p
                        onClick={() => onUserClick(trade.requesterId)}
                        className="text-sm md:text-base md:text-lg text-stone-600 truncate hover:underline cursor-pointer"
                      >
                        Solicitante: {trade.requesterName}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {offeredBook?.coverUrl ? (
                      <img
                        src={offeredBook.coverUrl}
                        alt=""
                        className="h-14 w-10 rounded-lg object-cover ring-1 ring-stone-200 shrink-0 cursor-pointer"
                        onClick={() => offeredBook && onBookClick(offeredBook.id)}
                      />
                    ) : (
                      <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                        <BookOpen className="h-5 w-5" />
                      </div>
                    )}
                    <div className="truncate flex-1">
                      <span className="text-sm md:text-base font-bold text-blue-800 uppercase block">
                        Libro a Cambio:
                      </span>
                      <p
                        onClick={() => offeredBook && onBookClick(offeredBook.id)}
                        className="text-base md:text-lg font-bold text-stone-900 truncate hover:text-blue-900 cursor-pointer"
                      >
                        {offeredBook?.title || "Libro ofrecido"}
                      </p>
                      <p
                        onClick={() => onUserClick(trade.requesterId)}
                        className="text-sm md:text-base md:text-lg text-stone-600 truncate hover:underline cursor-pointer"
                      >
                        Ofrecido por: {trade.requesterName}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
              {type === "received" && onAccept && onReject && (
                <div className="flex items-center gap-2.5 w-full sm:w-auto ml-auto">
                  <button
                    onClick={() => onReject(trade.id)}
                    className="flex-1 sm:flex-initial rounded-xl border border-stone-200 px-4 py-2.5 text-base md:text-lg font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => onAccept(trade.id)}
                    className="flex-1 sm:flex-initial rounded-xl bg-amber-800 px-5 py-2.5 text-base md:text-lg font-bold text-white shadow-xs hover:bg-amber-900 transition-colors"
                  >
                    Aceptar Solicitud
                  </button>
                </div>
              )}

              {type === "sent" && onCancel && (
                <button
                  onClick={() => onCancel(trade.id)}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-base md:text-lg font-semibold text-red-600 hover:bg-red-50 ml-auto transition-colors"
                >
                  Cancelar Solicitud
                </button>
              )}

              {type === "ongoing" && (
                <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                  {/* Cancel / Dispute button to prevent stuck trades */}
                  {onCancel && (
                    <div>
                      {confirmCancelId === trade.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm md:text-base md:text-lg text-red-700 font-medium">¿Confirmás cancelar?</span>
                          <button
                            onClick={() => {
                              onCancel(trade.id)
                              setConfirmCancelId(null)
                            }}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm md:text-base md:text-lg font-bold text-white hover:bg-red-700"
                          >
                            Sí, cancelar
                          </button>
                          <button
                            onClick={() => setConfirmCancelId(null)}
                            className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm md:text-base md:text-lg font-semibold text-stone-600 hover:bg-stone-100"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmCancelId(trade.id)}
                          className="rounded-xl border border-stone-200 px-3.5 py-2 text-sm md:text-base md:text-lg font-medium text-stone-600 hover:text-red-600 hover:border-red-200 transition-colors"
                        >
                          Cancelar trueque
                        </button>
                      )}
                    </div>
                  )}

                  {/* Main Role Confirmation */}
                  <div className="ml-auto">
                    {renderOngoingAction(trade, isRequester, isOwner, onConfirmReceipt)}
                  </div>
                </div>
              )}

              {type === "history" && onReviewClick && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm md:text-base md:text-lg text-stone-600">
                    {trade.status === "COMPLETADO"
                      ? "Intercambio completado con éxito."
                      : trade.status === "CANCELADO"
                      ? "Intercambio cancelado. Puntos y libros liberados."
                      : "Solicitud rechazada."}
                  </span>

                  {trade.status === "COMPLETADO" && (
                    <div>
                      {hasReviewed ? (
                        <span className="flex items-center gap-1.5 text-sm md:text-base md:text-lg font-semibold text-stone-500">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          Calificado
                        </span>
                      ) : (
                        <button
                          onClick={() => onReviewClick(trade)}
                          className="flex items-center gap-1.5 rounded-xl bg-amber-100 border border-amber-300 px-3.5 py-2 text-sm md:text-base md:text-lg font-bold text-amber-900 hover:bg-amber-200 transition-colors"
                        >
                          <Star className="h-4 w-4 fill-amber-600 text-amber-600" />
                          Calificar (+5 pts)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
