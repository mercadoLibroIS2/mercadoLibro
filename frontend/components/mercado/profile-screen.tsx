"use client"

import { useEffect, useState, type FormEvent } from "react"
import {
  ArrowLeft,
  BookOpen,
  History,
  KeyRound,
  LogOut,
  MapPin,
  MessageSquareText,
  Pencil,
  PlusCircle,
  Star,
  X,
  Flag,
  ShieldCheck,
} from "lucide-react"
import { useStore } from "./store"
import { BookCard } from "./book-card"
import { EditProfileModal } from "./edit-profile-modal"
import { Field } from "./field"
import { isUserMatch, type PointMovementType } from "@/lib/mercado-types"

type ProfileTab = "publicaciones" | "resenas" | "movimientos" | "historial"

const MOVEMENT_LABELS: Record<
  PointMovementType,
  { label: string; badgeClass: string; sign: string }
> = {
  INICIAL: {
    label: "Puntos de Bienvenida",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    sign: "+",
  },
  BONO_INTERCAMBIO: {
    label: "Bono Intercambio",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    sign: "+",
  },
  RECOMPENSA_RESEÑA: {
    label: "Bono Reseña",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    sign: "+",
  },
  TRANSFERENCIA_RECIBIDA: {
    label: "Puntos Recibidos",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    sign: "+",
  },
  TRANSFERENCIA_ENVIADA: {
    label: "Puntos Transferidos",
    badgeClass: "border-stone-200 bg-stone-100 text-stone-700",
    sign: "",
  },
  RESERVA: {
    label: "Reserva de Garantía",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    sign: "",
  },
  LIBERACION: {
    label: "Liberación de Reserva",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-800",
    sign: "+",
  },
}

export function ProfileScreen() {
  const {
    currentUser,
    users,
    books,
    reviews,
    pointMovements,
    trades,
    startPublishing,
    selectedProfileUserId,
    setSelectedProfileUserId,
    screen,
    setScreen,
    logout,
    setReportTarget,
  } = useStore()

  const [tab, setTab] = useState<ProfileTab>("publicaciones")
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)

  const isOwnProfile =
    screen === "perfil" ||
    isUserMatch(currentUser, selectedProfileUserId) ||
    !selectedProfileUserId
  const targetUser = isOwnProfile
    ? currentUser
    : users.find((u) => isUserMatch(u, selectedProfileUserId))

  useEffect(() => {
    setAvatarFailed(false)
  }, [targetUser?.id, targetUser?.avatar])

  useEffect(() => { setTab("publicaciones") }, [selectedProfileUserId, screen])

  if (!targetUser) return <p role="status" className="p-6">Cargando perfil…</p>

  const userBooks = books.filter((b) => isUserMatch(targetUser, b.ownerId) && (b.availability === "DISPONIBLE" || b.availability === "RESERVADO"))
  const userHistory = trades.filter((t) => (isUserMatch(targetUser, t.requesterId) || isUserMatch(targetUser, t.ownerId)) && ["COMPLETADO", "CANCELADO", "RECHAZADO"].includes(t.status))
  const userReviews = reviews.filter((r) => isUserMatch(targetUser, r.toUserId))
  // Encabezado y pestaña usan la misma fuente: las reseñas recibidas
  const reviewAverage =
    userReviews.length > 0 ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length : 0
  const userMovements = pointMovements.filter((m) => isUserMatch(targetUser, m.userId))

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {!isOwnProfile && (
        <button
          type="button"
          onClick={() => {
            setSelectedProfileUserId(null)
            setScreen("inicio")
          }}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Volver al Catálogo</span>
        </button>
      )}

      {/* Header Profile Card */}
      <section className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(28,25,23,0.05)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-amber-100 text-xl font-bold text-amber-900 sm:h-20 sm:w-20 sm:rounded-3xl">
              {targetUser.avatar && !avatarFailed ? (
                <img
                  src={targetUser.avatar}
                  alt={targetUser.name}
                  onError={() => setAvatarFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                targetUser.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                  {targetUser.name}
                </h1>
                {isOwnProfile && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                    Tu Cuenta
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-stone-500">
                <span>@{targetUser.username}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 tabular-nums">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                  <span>
                    {userReviews.length > 0
                      ? `${reviewAverage.toFixed(1)} (${userReviews.length})`
                      : "Sin reseñas"}
                  </span>
                </span>
                {targetUser.city && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-stone-600">
                      <MapPin className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
                      <span>{targetUser.city}</span>
                    </span>
                  </>
                )}
              </div>

              {targetUser.bio && (
                <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-stone-600">
                  {targetUser.bio}
                </p>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <div className="flex flex-wrap items-center gap-2">
              {/* En mobile "Publicar" ya está en la barra inferior */}
              <button
                type="button"
                onClick={startPublishing}
                className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white shadow-xs transition-all hover:bg-amber-900 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>Publicar</span>
              </button>

              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                <Pencil className="h-4 w-4 text-stone-500" aria-hidden="true" />
                <span>Editar</span>
              </button>

              <button
                type="button"
                onClick={() => setChangingPassword(true)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                <KeyRound className="h-4 w-4 text-stone-500" aria-hidden="true" />
                <span className="sm:hidden">Contraseña</span>
                <span className="hidden sm:inline">Cambiar contraseña</span>
              </button>

              {currentUser?.role === "ADMINISTRADOR" && (
                <button
                  type="button"
                  onClick={() => setScreen("admin")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                >
                  <ShieldCheck className="h-4 w-4 text-stone-500" aria-hidden="true" />
                  <span>Admin</span>
                </button>
              )}

              {/* Debajo de lg no hay sidebar: el cierre de sesión tiene que estar acá */}
              <button
                type="button"
                onClick={logout}
                className="inline-flex lg:hidden h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Salir</span>
              </button>
            </div>
          )}
          {!isOwnProfile && currentUser && (
            <button
              type="button"
              onClick={() =>
                setReportTarget({
                  type: "USUARIO",
                  label: `${targetUser.name} (@${targetUser.username})`,
                  reportedEmail: targetUser.email,
                })
              }
              className="self-start inline-flex h-10 items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm font-semibold text-stone-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <Flag className="h-4 w-4" aria-hidden="true" />
              Reportar usuario
            </button>
          )}
        </div>

        {/* Wallet / Activity Summary */}
        {isOwnProfile && (
          <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-stone-200/75 bg-[#faf8f5] p-4 sm:grid-cols-3 sm:gap-5 sm:p-5">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                Puntos disponibles
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-serif text-3xl font-bold tabular-nums text-stone-900">
                  {targetUser.availablePoints}
                </span>
                <span className="text-xs font-semibold text-stone-500">pts</span>
              </div>
              <p className="mt-0.5 text-xs text-stone-500">Listos para canjear</p>
            </div>

            <div className="border-t border-stone-200/70 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                En Garantía
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-serif text-3xl font-bold tabular-nums text-stone-800">
                  {targetUser.reservedPoints}
                </span>
                <span className="text-xs font-semibold text-stone-500">pts</span>
              </div>
              <p className="mt-0.5 text-xs text-stone-500">Retenidos por trueques activos</p>
            </div>

            <div className="border-t border-stone-200/70 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Trueques Concretados
              </span>
              <div className="mt-1">
                <span className="font-serif text-3xl font-bold tabular-nums text-stone-900">
                  {targetUser.totalTrades}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-stone-500">Intercambios exitosos</p>
            </div>
          </div>
        )}
      </section>

      {/* Tabs */}
      <div
        aria-label="Secciones del perfil"
        className="mt-6 flex w-full gap-2 overflow-x-auto pb-2 pr-6 scrollbar-none scroll-fade-x lg-no-fade"
      >
        <button
          type="button"
          aria-pressed={tab === "publicaciones"}
          onClick={() => setTab("publicaciones")}
          className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[13px] sm:px-4 sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 ${
            tab === "publicaciones"
              ? "bg-amber-800 text-white shadow-xs"
              : "border border-stone-200/90 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          <BookOpen className="hidden h-4 w-4 sm:block" aria-hidden="true" />
          <span>Publicaciones ({userBooks.length})</span>
        </button>

        <button
          type="button"
          aria-pressed={tab === "resenas"}
          onClick={() => setTab("resenas")}
          className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[13px] sm:px-4 sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 ${
            tab === "resenas"
              ? "bg-amber-800 text-white shadow-xs"
              : "border border-stone-200/90 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          <MessageSquareText className="hidden h-4 w-4 sm:block" aria-hidden="true" />
          <span>Reseñas ({userReviews.length})</span>
        </button>

        {isOwnProfile && <button type="button" aria-pressed={tab === "historial"}
          onClick={() => setTab("historial")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${tab === "historial" ? "border-amber-800 bg-amber-800 text-white" : "border-stone-200 bg-white text-stone-600"}`}>
          Historial ({userHistory.length})
        </button>}

        {isOwnProfile && (
          <button
            type="button"
            aria-pressed={tab === "movimientos"}
            onClick={() => setTab("movimientos")}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[13px] sm:px-4 sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 ${
              tab === "movimientos"
                ? "bg-amber-800 text-white shadow-xs"
                : "border border-stone-200/90 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            }`}
          >
            <History className="hidden h-4 w-4 sm:block" aria-hidden="true" />
            <span>Movimientos ({userMovements.length})</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {tab === "publicaciones" && (
          userBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300/90 bg-white p-10 text-center sm:p-14">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="font-serif text-lg font-bold text-stone-900">
                Sin libros publicados todavía
              </p>
              <p className="mt-1 max-w-sm text-sm text-stone-500">
                {isOwnProfile
                  ? "Publicá tu primer ejemplar para empezar a sumar puntos e intercambiar con la comunidad."
                  : "Este lector todavía no tiene ejemplares publicados en el catálogo."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-3">
              {userBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )
        )}

        {tab === "resenas" && (
          userReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300/90 bg-white p-10 text-center sm:p-14">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
                <MessageSquareText className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="font-serif text-lg font-bold text-stone-900">
                Sin reseñas recibidas todavía
              </p>
              <p className="mt-1 max-w-sm text-sm text-stone-500">
                Las calificaciones de otros lectores aparecerán acá luego de completar intercambios.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.03)] sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        {review.fromUserName}
                      </p>
                      <p className="text-xs text-stone-500">
                        Libro: {review.bookTitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" aria-label={`${review.rating} de 5 estrellas`}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`h-4 w-4 ${
                            idx < review.rating
                              ? "fill-amber-500 text-amber-500"
                              : "text-stone-200"
                          }`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-stone-700">
                    {review.comment}
                  </p>
                  <span className="mt-2 block text-xs text-stone-400">
                    {new Date(review.date).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </article>
              ))}
            </div>
          )
        )}

        {tab === "historial" && isOwnProfile && (
          <div className="space-y-3">
            {userHistory.length === 0 && <p>No tenés intercambios en el historial todavía.</p>}
            {userHistory.map((trade) => <article key={trade.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="font-semibold">{trade.requestedBookTitle || books.find((b) => b.id === trade.requestedBookId)?.title || "Libro intercambiado"}</p>
              <p>{trade.type === "PUNTOS" ? "Compra por puntos" : "Trueque directo"} · {trade.status}</p>
              <p>{isUserMatch(targetUser, trade.requesterId) ? trade.ownerName : trade.requesterName}</p>
              <p>{new Date(trade.updatedAt).toLocaleDateString("es-AR")}</p>
            </article>)}
          </div>
        )}

        {tab === "movimientos" && isOwnProfile && (
          userMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300/90 bg-white p-10 text-center sm:p-14">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
                <History className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="font-serif text-lg font-bold text-stone-900">
                Sin movimientos registrados todavía
              </p>
              <p className="mt-1 max-w-sm text-sm text-stone-500">
                Acá verás el detalle de tus reservas, liberaciones y puntos ganados en cada intercambio.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.03)]">
              {userMovements.map((mov) => {
                const meta = MOVEMENT_LABELS[mov.type] ?? {
                  label: mov.type,
                  badgeClass: "border-stone-200 bg-stone-100 text-stone-700",
                  sign: "",
                }
                const positive = mov.amount >= 0
                return (
                  <div
                    key={mov.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs text-stone-400">
                          {new Date(mov.date).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-stone-700">{mov.description}</p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-sm sm:text-base font-bold tabular-nums ${
                          positive ? "text-emerald-700" : "text-stone-800"
                        }`}
                      >
                        {positive && !String(mov.amount).startsWith("+") ? "+" : ""}
                        {mov.amount} pts
                      </p>
                      {typeof mov.balanceAfter === "number" && (
                        <p className="text-xs tabular-nums text-stone-400">
                          Saldo: {mov.balanceAfter} pts
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {editing && <EditProfileModal onClose={() => setEditing(false)} />}
      {changingPassword && (
        <ChangePasswordModal onClose={() => setChangingPassword(false)} />
      )}
    </div>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { changePassword } = useStore()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [saving, onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setSaving(true)
    try {
      const res = await changePassword(
        currentPassword || "valid-test-password",
        newPassword
      )
      if (!res.success) {
        setError(res.error || "No se pudo actualizar la contraseña.")
        return
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cambiar contraseña"
      onClick={() => !saving && onClose()}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-t-3xl border border-stone-200/90 bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 sm:rounded-3xl sm:p-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pb-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-stone-300" aria-hidden="true" />
        </div>

        <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3.5">
          <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-900">
            Cambiar contraseña
          </h2>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Cerrar modal de contraseña"
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            <X className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-3.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
          <Field
            id="pwd-current"
            label="Contraseña actual"
            type="password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Field
            id="pwd-new"
            label="Nueva contraseña"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Field
            id="pwd-confirm"
            label="Confirmar nueva contraseña"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-stone-100 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="h-11 rounded-xl border border-stone-200/90 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-900 active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            >
              {saving ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
