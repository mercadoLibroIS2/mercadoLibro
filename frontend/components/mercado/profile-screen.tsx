"use client"

import { useState } from "react"
import {
  BookOpen,
  MessageSquareText,
  Pencil,
  PlusCircle,
  Star,
  History,
} from "lucide-react"
import { useStore } from "./store"
import { BookCard } from "./book-card"
import { EditProfileModal } from "./edit-profile-modal"
import type { PointMovementType } from "@/lib/mercado-types"

type ProfileTab = "publicaciones" | "resenas" | "movimientos"

const MOVEMENT_LABELS: Record<PointMovementType, { label: string; color: string; sign: string }> = {
  INICIAL: { label: "Puntos de Bienvenida", color: "text-emerald-700 bg-emerald-50 border-emerald-200", sign: "+" },
  BONO_INTERCAMBIO: { label: "Bono Intercambio", color: "text-emerald-700 bg-emerald-50 border-emerald-200", sign: "+" },
  RECOMPENSA_RESEÑA: { label: "Bono Reseña", color: "text-emerald-700 bg-emerald-50 border-emerald-200", sign: "+" },
  TRANSFERENCIA_RECIBIDA: { label: "Puntos Recibidos", color: "text-emerald-700 bg-emerald-50 border-emerald-200", sign: "+" },
  TRANSFERENCIA_ENVIADA: { label: "Puntos Transferidos", color: "text-stone-700 bg-stone-100 border-stone-200", sign: "" },
  RESERVA: { label: "Reserva de Garantía", color: "text-amber-700 bg-amber-50 border-amber-200", sign: "" },
  LIBERACION: { label: "Liberación de Reserva", color: "text-blue-700 bg-blue-50 border-blue-200", sign: "+" },
}

export function ProfileScreen() {
  const {
    currentUser,
    users,
    books,
    reviews,
    pointMovements,
    selectedProfileUserId,
    setSelectedProfileUserId,
    screen,
    setScreen,
  } = useStore()

  const [tab, setTab] = useState<ProfileTab>("publicaciones")
  const [editing, setEditing] = useState(false)

  const isOwnProfile = screen === "perfil" || selectedProfileUserId === currentUser?.id
  const targetUser = isOwnProfile
    ? currentUser
    : users.find((u) => u.id === selectedProfileUserId) || currentUser

  if (!targetUser) return null

  const userBooks = books.filter((b) => b.ownerId === targetUser.id)
  const userReviews = reviews.filter((r) => r.toUserId === targetUser.id)
  const userMovements = pointMovements.filter((m) => m.userId === targetUser.id)

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-x-hidden">
      {!isOwnProfile && (
        <button
          onClick={() => {
            setSelectedProfileUserId(null)
            setScreen("inicio")
          }}
          className="mb-3 text-sm md:text-base font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1"
        >
          ← Volver al Catálogo
        </button>
      )}

      {/* Header Profile Card */}
      <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={targetUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"}
              alt={targetUser.name}
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl sm:rounded-3xl object-cover ring-2 ring-amber-700/20 shadow-xs shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl sm:text-3xl font-bold text-stone-900">
                  {targetUser.name}
                </h1>
                {isOwnProfile && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm md:text-base font-bold text-amber-900">
                    Tu Cuenta
                  </span>
                )}
              </div>
              <p className="text-base md:text-lg text-stone-500 mt-0.5">@{targetUser.username}</p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm md:text-base md:text-lg text-stone-500">
                <span className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-sm md:text-base md:text-lg font-bold text-amber-900">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  {targetUser.rating.toFixed(1)} ({targetUser.totalReviews})
                </span>
                <span className="text-sm md:text-base md:text-lg text-stone-500">
                  • {targetUser.totalTrades} trueques concretados
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {isOwnProfile && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setScreen("publicar")}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-amber-800 px-4 py-2.5 text-base md:text-lg font-bold text-white shadow-xs hover:bg-amber-900 transition-all active:scale-95"
              >
                <PlusCircle className="h-4.5 w-4.5" />
                <span>Publicar</span>
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-base md:text-lg font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <Pencil className="h-4 w-4" />
                <span>Editar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Compact Wallet Card (Own profile) */}
      {isOwnProfile && (
        <div className="mt-4 rounded-2xl sm:rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/30 p-4 sm:p-6 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <div>
              <span className="text-sm md:text-base md:text-lg font-bold uppercase tracking-wider text-amber-800 block">
                Puntos Disponibles
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-serif text-2xl sm:text-4xl font-extrabold text-amber-950">
                  {targetUser.availablePoints}
                </span>
                <span className="text-sm md:text-base md:text-lg font-bold text-amber-900/70">pts</span>
              </div>
              <p className="text-sm md:text-base md:text-lg text-amber-900/70 mt-0.5 hidden sm:block">Listos para canjear</p>
            </div>

            <div>
              <span className="text-sm md:text-base md:text-lg font-bold uppercase tracking-wider text-stone-600 block">
                En Garantía
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-serif text-2xl sm:text-4xl font-bold text-stone-700">
                  {targetUser.reservedPoints}
                </span>
                <span className="text-sm md:text-base md:text-lg font-medium text-stone-500">pts</span>
              </div>
              <p className="text-sm md:text-base md:text-lg text-stone-500 mt-0.5 hidden sm:block">Retenidos por trueques</p>
            </div>

            <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-amber-200/60 pt-2 sm:pt-0 sm:pl-4">
              <span className="text-sm md:text-base md:text-lg font-bold uppercase tracking-wider text-stone-600 block">
                Trueques Concretados
              </span>
              <span className="font-serif text-2xl sm:text-4xl font-bold text-stone-800 block mt-1">
                {targetUser.totalTrades}
              </span>
              <p className="text-sm md:text-base md:text-lg text-stone-500 mt-0.5 hidden sm:block">Intercambios exitosos</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-4 sm:mt-6 w-full flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setTab("publicaciones")}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm md:text-base font-bold whitespace-nowrap transition-all ${
            tab === "publicaciones"
              ? "bg-amber-800 text-white shadow-xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Publicaciones ({userBooks.length})</span>
        </button>

        <button
          onClick={() => setTab("resenas")}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm md:text-base font-bold whitespace-nowrap transition-all ${
            tab === "resenas"
              ? "bg-amber-800 text-white shadow-xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          }`}
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          <span>Reseñas ({userReviews.length})</span>
        </button>

        {isOwnProfile && (
          <button
            onClick={() => setTab("movimientos")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm md:text-base font-bold whitespace-nowrap transition-all ${
              tab === "movimientos"
                ? "bg-amber-800 text-white shadow-xs"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Movimientos ({userMovements.length})</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-3 sm:mt-6">
        {tab === "publicaciones" && (
          <div>
            {userBooks.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {userBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center">
                <BookOpen className="h-8 w-8 text-stone-300 mb-2" />
                <p className="font-serif text-base md:text-lg font-bold text-stone-800">
                  Sin libros publicados todavía
                </p>
                <p className="mt-1 text-sm md:text-base text-stone-500 max-w-sm">
                  {isOwnProfile
                    ? "Publicá tu primer libro para comenzar a recibir solicitudes."
                    : "Este usuario aún no tiene publicaciones activas."}
                </p>
                {isOwnProfile && (
                  <button
                    onClick={() => setScreen("publicar")}
                    className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-800 px-3.5 py-2 text-sm md:text-base font-bold text-white hover:bg-amber-900"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Publicar libro
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "resenas" && (
          <div className="space-y-3">
            {userReviews.length > 0 ? (
              userReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-amber-500">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-500" />
                        ))}
                      </div>
                      <span className="text-sm md:text-base font-bold text-stone-900">
                        De {rev.fromUserName}
                      </span>
                    </div>
                    <span className="text-sm md:text-base text-stone-400">
                      {new Date(rev.date).toLocaleDateString("es-AR")}
                    </span>
                  </div>

                  {rev.bookTitle && (
                    <div className="mt-1 text-sm md:text-base font-semibold text-amber-900 bg-amber-50/70 border border-amber-200 px-2.5 py-0.5 rounded-lg inline-block">
                      📖 {rev.bookTitle}
                    </div>
                  )}

                  <p className="mt-2 text-sm md:text-base md:text-lg text-stone-700 italic bg-stone-50 p-3 rounded-xl border border-stone-100">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center">
                <MessageSquareText className="h-8 w-8 text-stone-300 mb-2" />
                <p className="font-serif text-base md:text-lg font-bold text-stone-800">
                  Sin reseñas recibidas todavía
                </p>
                <p className="mt-1 text-sm md:text-base text-stone-500 max-w-sm">
                  Las calificaciones aparecerán automáticamente tras concretar trueques.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "movimientos" && isOwnProfile && (
          <div className="space-y-2 rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs divide-y divide-stone-100">
            {userMovements.map((mov) => {
              const meta = MOVEMENT_LABELS[mov.type] || {
                label: mov.type,
                color: "text-stone-700 bg-stone-100 border-stone-200",
                sign: "",
              }

              return (
                <div
                  key={mov.id}
                  className="flex items-center justify-between gap-3 p-3.5 hover:bg-stone-50/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-sm md:text-base font-bold uppercase tracking-wider ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm md:text-base md:text-lg text-stone-800 font-medium truncate">
                      {mov.description}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-serif text-sm md:text-base md:text-lg font-bold ${
                        mov.amount > 0 ? "text-emerald-700" : "text-stone-800"
                      }`}
                    >
                      {mov.amount > 0 ? `+${mov.amount}` : mov.amount} pts
                    </span>
                    <span className="block text-sm md:text-base text-stone-500 font-medium">
                      Saldo: {mov.balanceAfter} pts
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editing ? <EditProfileModal onClose={() => setEditing(false)} /> : null}
    </div>
  )
}
