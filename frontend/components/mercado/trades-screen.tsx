"use client"

import { useState, type ComponentType } from "react"
import {
  ArrowRightLeft,
  BookOpen,
  CheckCheck,
  CheckCircle,
  Clock,
  Coins,
  History as HistoryIcon,
  Inbox,
  Send,
  Share2,
  Star,
  Flag,
} from "lucide-react"
import { useStore } from "./store"
import { BookCoverThumb } from "./cover-thumb"
import { ChainsView } from "./chains-view"
import { isUserMatch, type TradeRequest } from "@/lib/mercado-types"
import { BONO_INTERCAMBIO_DIRECTO, BONO_RESENIA } from "@/lib/puntos"

type TradeTab = "recibidas" | "enviadas" | "en_curso" | "historial" | "cadenas"

const STATUS_BADGES: Record<TradeRequest["status"], { label: string; className: string }> = {
  PENDIENTE: {
    label: "Pendiente",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  ACEPTADO: {
    label: "En Curso",
    className: "border-sky-200 bg-sky-50 text-sky-800",
  },
  COMPLETADO: {
    label: "Completado",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  RECHAZADO: {
    label: "Rechazado",
    className: "border-rose-200 bg-rose-50 text-rose-800",
  },
  CANCELADO: {
    label: "Cancelado",
    className: "border-stone-200 bg-stone-100 text-stone-700",
  },
}

export function TradesScreen() {
  const {
    trades,
    currentUser,
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
    (t) => isUserMatch(currentUser, t.ownerId) && t.status === "PENDIENTE"
  )
  const sentRequests = trades.filter(
    (t) => isUserMatch(currentUser, t.requesterId) && t.status === "PENDIENTE"
  )
  const ongoingTrades = trades.filter(
    (t) =>
      (isUserMatch(currentUser, t.ownerId) ||
        isUserMatch(currentUser, t.requesterId)) &&
      t.status === "ACEPTADO"
  )
  const historyTrades = trades.filter(
    (t) =>
      (isUserMatch(currentUser, t.ownerId) ||
        isUserMatch(currentUser, t.requesterId)) &&
      (t.status === "COMPLETADO" ||
        t.status === "RECHAZADO" ||
        t.status === "CANCELADO")
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800">
          <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Gestión de Trueques</span>
        </div>
        <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Mis Intercambios
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Administrá solicitudes recibidas, envíos en curso, historial y cadenas circulares.
        </p>
      </div>

      {/* Tabs */}
      <div
        aria-label="Categorías de intercambios"
        className="flex w-full gap-2 overflow-x-auto pb-2 pr-6 scrollbar-none scroll-fade-x lg-no-fade"
      >
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

      {/* Content */}
      <div className="mt-4 sm:mt-6">
        {activeTab === "recibidas" && (
          <TradeList
            trades={receivedRequests}
            emptyMessage="No tenés solicitudes recibidas pendientes."
            type="received"
            currentUserId={currentUser.id}
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
            currentUserId={currentUser.id}
            onCancel={cancelTrade}
            onBookClick={setSelectedBookId}
            onUserClick={viewUserProfile}
          />
        )}

        {activeTab === "en_curso" && (
          <TradeList
            trades={ongoingTrades}
            emptyMessage="No tenés intercambios en curso actualmente."
            type="ongoing"
            currentUserId={currentUser.id}
            onCancel={cancelTrade}
            onConfirmReceipt={confirmTradeReceipt}
            onBookClick={setSelectedBookId}
            onUserClick={viewUserProfile}
          />
        )}

        {activeTab === "historial" && (
          <TradeList
            trades={historyTrades}
            emptyMessage="Aún no completaste ni cerraste intercambios."
            type="history"
            currentUserId={currentUser.id}
            onReviewClick={setReviewTrade}
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
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 ${
        active
          ? "bg-amber-800 text-white shadow-xs"
          : "border border-stone-200/90 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
      {typeof count === "number" && count > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums leading-none ${
            active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-700"
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
    if (isRequester && !trade.ownerConfirmed) {
      // El backend solo acepta la recepción después de que el vendedor registró la entrega
      return (
        <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-amber-900">
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Esperando que el vendedor registre la entrega</span>
        </span>
      )
    }
    if (isRequester) {
      return (
        <button
          type="button"
          onClick={() => onConfirmReceipt?.(trade.id)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-xs transition-all hover:bg-emerald-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          <span>Confirmar Recepción</span>
        </button>
      )
    }
    if (trade.ownerConfirmed) {
      return (
        <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-800">
          <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Entrega registrada (Esperando recepción del comprador)</span>
        </span>
      )
    }
    return (
      <button
        type="button"
        onClick={() => onConfirmReceipt?.(trade.id)}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white shadow-xs transition-all hover:bg-amber-900 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
      >
        <CheckCheck className="h-4 w-4" aria-hidden="true" />
        <span>Confirmar Entrega del Libro</span>
      </button>
    )
  }

  if (
    (isRequester && trade.requesterConfirmed) ||
    (isOwner && trade.ownerConfirmed)
  ) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-800">
        <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Tu recepción está confirmada (Esperando a la otra parte)</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onConfirmReceipt?.(trade.id)}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-xs transition-all hover:bg-emerald-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
    >
      <CheckCheck className="h-4 w-4" aria-hidden="true" />
      <span>Confirmar Recepción de Libro (+{BONO_INTERCAMBIO_DIRECTO} pts)</span>
    </button>
  )
}

function TradeList({
  trades,
  emptyMessage,
  type,
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
  const { books, currentUser, setReportTarget } = useStore()
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300/90 bg-white p-10 text-center sm:p-14">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
          <ArrowRightLeft className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="font-serif text-lg font-bold text-stone-900">
          {emptyMessage}
        </p>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-stone-500">
          Explorá el catálogo para descubrir ejemplares o publicá tus libros para empezar a intercambiar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {trades.map((trade) => {
        const requestedBook = books.find((b) => b.id === trade.requestedBookId)
        const offeredBook = trade.offeredBookId
          ? books.find((b) => b.id === trade.offeredBookId)
          : null

        const isRequester = isUserMatch(currentUser, trade.requesterId)
        const isOwner = isUserMatch(currentUser, trade.ownerId)
        const hasReviewed = isRequester
          ? Boolean(trade.reviewedByRequester)
          : Boolean(trade.reviewedByOwner)
        const statusMeta = STATUS_BADGES[trade.status]

        return (
          <article
            key={trade.id}
            className="rounded-2xl sm:rounded-3xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.03)] sm:p-5"
          >
            {/* Card top metadata */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    trade.type === "PUNTOS"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-sky-200 bg-sky-50 text-sky-900"
                  }`}
                >
                  {trade.type === "PUNTOS" ? "Canje por Puntos" : "Trueque Directo"}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusMeta.className}`}
                >
                  {statusMeta.label}
                </span>
              </div>

              <span className="flex items-center gap-2 text-xs text-stone-400">
                {trade.id.split("|").length === 5 && (isRequester || isOwner) && trade.status !== "RECHAZADO" && (
                  <button
                    type="button"
                    title="Reportar un problema con este intercambio"
                    onClick={() =>
                      setReportTarget({
                        type: "INTERCAMBIO",
                        label: `"${requestedBook?.title || "Libro"}" con ${isRequester ? trade.ownerName : trade.requesterName}`,
                        tradeId: trade.id,
                      })
                    }
                    className="flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-stone-400 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                  >
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Reportar</span>
                  </button>
                )}
                {new Date(trade.createdAt).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            {/* Book & Counterparty Pair */}
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Requested Book */}
              <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-[#faf8f5] p-3">
                <button
                  type="button"
                  disabled={!requestedBook}
                  onClick={() => requestedBook && onBookClick(requestedBook.id)}
                  aria-label={
                    requestedBook
                      ? `Ver detalle de ${requestedBook.title}`
                      : "Libro solicitado"
                  }
                  className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-100 text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                >
                  <BookCoverThumb src={requestedBook?.coverUrl} className="h-full w-full rounded-none border-0 bg-transparent" iconClassName="h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                    Libro solicitado
                  </span>
                  <button
                    type="button"
                    disabled={!requestedBook}
                    onClick={() => requestedBook && onBookClick(requestedBook.id)}
                    className="block max-w-full truncate text-left text-sm font-semibold text-stone-900 transition-colors hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                  >
                    {requestedBook?.title || trade.requestedBookTitle || "Libro"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUserClick(trade.ownerId)}
                    className="mt-0.5 block max-w-full truncate text-left text-xs text-stone-600 hover:text-stone-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                  >
                    Dueño: {trade.ownerName}
                  </button>
                </div>
              </div>

              {/* Counterpart / Offered Element */}
              <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-[#faf8f5] p-3">
                {trade.type === "PUNTOS" ? (
                  <>
                    <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-amber-50 text-amber-800">
                      <Coins className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                        Contraprestación
                      </span>
                      <p className="truncate text-sm font-semibold tabular-nums text-stone-900">
                        {trade.points} Puntos en Garantía
                      </p>
                      <button
                        type="button"
                        onClick={() => onUserClick(trade.requesterId)}
                        className="mt-0.5 block max-w-full truncate text-left text-xs text-stone-600 hover:text-stone-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                      >
                        Solicitante: {trade.requesterName}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={!offeredBook}
                      onClick={() => offeredBook && onBookClick(offeredBook.id)}
                      aria-label={
                        offeredBook
                          ? `Ver detalle de ${offeredBook.title}`
                          : "Libro ofrecido"
                      }
                      className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-sky-50 text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                    >
                      <BookCoverThumb src={offeredBook?.coverUrl} className="h-full w-full rounded-none border-0 bg-transparent text-sky-700" iconClassName="h-5 w-5" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-sky-800">
                        Libro a cambio
                      </span>
                      <button
                        type="button"
                        disabled={!offeredBook}
                        onClick={() => offeredBook && onBookClick(offeredBook.id)}
                        className="block max-w-full truncate text-left text-sm font-semibold text-stone-900 transition-colors hover:text-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                      >
                        {offeredBook?.title || trade.offeredBookTitle || "Libro ofrecido"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUserClick(trade.requesterId)}
                        className="mt-0.5 block max-w-full truncate text-left text-xs text-stone-600 hover:text-stone-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                      >
                        Ofrecido por: {trade.requesterName}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {trade.type === "DIRECTO" && trade.points > 0 && trade.status !== "COMPLETADO" && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-900">
                <Coins className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                <span>
                  {(() => {
                    if (!trade.compensationPayerId) {
                      return `Incluye una compensación de ${trade.points} pts por la diferencia de valor entre los libros (la paga quien entrega el libro de menor valor).`
                    }
                    const payerIsRequester = isUserMatch({ id: trade.compensationPayerId, email: trade.compensationPayerId }, trade.requesterId)
                    const payerName = payerIsRequester ? trade.requesterName : trade.ownerName
                    const otherName = payerIsRequester ? trade.ownerName : trade.requesterName
                    return isUserMatch(currentUser, trade.compensationPayerId)
                      ? `Pagás ${trade.points} pts de compensación a ${otherName}: tu libro vale menos que el que recibís.`
                      : `${payerName} te paga ${trade.points} pts de compensación: tu libro vale más que el suyo.`
                  })()}
                </span>
              </p>
            )}

            {/* Footer Actions */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-stone-100 pt-3.5">
              {type === "received" && onAccept && onReject && (
                <div className="ml-auto flex w-full items-center gap-2.5 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => onReject(trade.id)}
                    className="h-10 flex-1 rounded-xl border border-stone-200/90 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 sm:flex-initial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    onClick={() => onAccept(trade.id)}
                    className="h-10 flex-1 rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-amber-900 sm:flex-initial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                  >
                    Aceptar Solicitud
                  </button>
                </div>
              )}

              {type === "sent" && onCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(trade.id)}
                  className="ml-auto h-10 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                >
                  Cancelar Solicitud
                </button>
              )}

              {type === "ongoing" && (
                <div className="flex w-full flex-wrap items-center justify-between gap-2.5">
                  {onCancel && (
                    <div>
                      {confirmCancelId === trade.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-medium text-rose-700">
                            ¿Confirmás cancelar?
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onCancel(trade.id)
                              setConfirmCancelId(null)
                            }}
                            className="h-9 rounded-lg bg-rose-600 px-3 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                          >
                            Sí, cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(null)}
                            className="h-9 rounded-lg border border-stone-200 bg-white px-3 text-xs sm:text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmCancelId(trade.id)}
                          className="h-10 rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm font-medium text-stone-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                        >
                          Cancelar trueque
                        </button>
                      )}
                    </div>
                  )}

                  <div className="ml-auto">
                    {renderOngoingAction(
                      trade,
                      isRequester,
                      isOwner,
                      onConfirmReceipt
                    )}
                  </div>
                </div>
              )}

              {type === "history" && onReviewClick && (
                <div className="flex w-full flex-wrap items-center justify-between gap-2.5">
                  <span className="text-xs sm:text-sm text-stone-600">
                    {trade.status === "COMPLETADO"
                      ? "Intercambio completado con éxito."
                      : trade.status === "CANCELADO"
                      ? "Intercambio cancelado. Puntos y libros liberados."
                      : "Solicitud rechazada."}
                  </span>

                  {trade.status === "COMPLETADO" && (
                    <div>
                      {hasReviewed ? (
                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-500">
                          <CheckCircle
                            className="h-4 w-4 text-emerald-600"
                            aria-hidden="true"
                          />
                          <span>Calificado</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onReviewClick(trade)}
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                        >
                          <Star
                            className="h-4 w-4 fill-amber-500 text-amber-600"
                            aria-hidden="true"
                          />
                          <span>Calificar (+{BONO_RESENIA} pts)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
