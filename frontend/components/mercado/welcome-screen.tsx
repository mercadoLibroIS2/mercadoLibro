"use client"

import {
  Compass,
  PartyPopper,
  PlusCircle,
  Coins,
  ArrowRightLeft,
  Target,
  ArrowRight,
} from "lucide-react"
import { useStore } from "./store"

export function WelcomeScreen() {
  const { currentUser, setScreen, startPublishing } = useStore()

  if (!currentUser) {
    return (
      <EmptyGate
        message="Iniciá sesión para acceder a la plataforma."
        onGo={() => setScreen("login")}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-[0_6px_24px_rgba(28,25,23,0.04)]">
        {/* Banner */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-800 px-6 sm:px-8 py-6 text-stone-50">
          <span className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur-xs">
            <PartyPopper className="h-6 w-6 sm:h-7 sm:w-7 text-amber-100" aria-hidden="true" />
          </span>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-200">
              Inicio de Sesión Exitoso
            </span>
            <h1 className="font-serif text-xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
              ¡Te damos la bienvenida, {currentUser.name}!
            </h1>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
          {/* Wallet greeting card */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-amber-100/30 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-amber-800 text-white shadow-sm shadow-amber-900/15">
                <Coins className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-900">
                  Saldo en tu Billetera
                </span>
                <p className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-amber-950 mt-0.5">
                  {currentUser.availablePoints} pts
                </p>
                <p className="text-sm text-amber-900/80 mt-0.5">
                  Canjeables por cualquier libro de la comunidad.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setScreen("inicio")}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-800 px-5 text-sm sm:text-[15px] font-semibold text-white shadow-sm shadow-amber-900/15 transition-all duration-150 ease-out hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 active:scale-[0.98] shrink-0"
            >
              <span>Explorar Catálogo</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Quick Actions Grid */}
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-900 mb-4">
              ¿Qué te gustaría hacer hoy?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ActionCard
                icon={Compass}
                title="Catálogo de Libros"
                description="Explorá títulos organizados por categoría y evaluados con el semáforo calidad-precio."
                cta="Ver catálogo"
                onClick={() => setScreen("inicio")}
                highlight
              />

              <ActionCard
                icon={PlusCircle}
                title="Publicar un Ejemplar"
                description="Poné a disposición un libro que ya leíste para recibir solicitudes y sumar trueques."
                cta="Publicar libro"
                onClick={startPublishing}
              />

              <ActionCard
                icon={ArrowRightLeft}
                title="Mis Intercambios"
                description="Revisá solicitudes recibidas, gestioná trueques en curso y confirmá recepciones."
                cta="Ir a intercambios"
                onClick={() => setScreen("intercambios")}
              />

              <ActionCard
                icon={Target}
                title="Tracker de Libros"
                description="Configurá alertas para recibir avisos instantáneos cuando se publique el libro que buscás."
                cta="Ver Tracker"
                onClick={() => setScreen("tracker")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionCard({
  icon: Icon,
  title,
  description,
  cta,
  onClick,
  highlight,
}: {
  icon: typeof Compass
  title: string
  description: string
  cta: string
  onClick: () => void
  highlight?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col justify-between rounded-2xl border p-5 text-left transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 focus-visible:ring-offset-2 active:scale-[0.99] ${
        highlight
          ? "border-amber-200/90 bg-amber-50/40 hover:border-amber-300"
          : "border-stone-200/80 bg-white hover:border-stone-300"
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 ${
              highlight
                ? "bg-amber-800 text-white"
                : "bg-stone-100 text-stone-700 group-hover:bg-amber-100 group-hover:text-amber-900"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <ArrowRight
            className="h-4 w-4 text-stone-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-amber-800"
            aria-hidden="true"
          />
        </div>
        <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
          {title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{description}</p>
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100">
        <span className="text-sm font-semibold text-amber-800 group-hover:underline">
          {cta} →
        </span>
      </div>
    </button>
  )
}

export function EmptyGate({
  message,
  onGo,
}: {
  message: string
  onGo: () => void
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm sm:text-base text-stone-600 text-balance leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onGo}
        className="h-11 rounded-xl bg-amber-800 px-5 text-sm sm:text-[15px] font-semibold text-stone-50 shadow-sm transition-all duration-150 hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 active:scale-[0.98]"
      >
        Ir a Iniciar sesión
      </button>
    </div>
  )
}
