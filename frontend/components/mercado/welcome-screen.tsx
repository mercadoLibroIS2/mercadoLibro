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
  const { currentUser, setScreen } = useStore()

  if (!currentUser) {
    return (
      <EmptyGate
        message="Iniciá sesión para acceder a la plataforma."
        onGo={() => setScreen("login")}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-6 lg:px-8 py-4 sm:py-10">
      <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200 bg-white shadow-xs">
        {/* Banner */}
        <div className="flex items-center gap-3.5 bg-gradient-to-r from-amber-900 to-amber-800 px-5 sm:px-8 py-6 text-stone-50">
          <span className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-700/60 shadow-inner">
            <PartyPopper className="h-6 w-6 sm:h-7 sm:w-7 text-amber-200" />
          </span>
          <div>
            <span className="text-sm md:text-base font-bold uppercase tracking-wider text-amber-200">
              Inicio de Sesión Exitoso
            </span>
            <h1 className="font-serif text-xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
              ¡Te damos la bienvenida, {currentUser.name}!
            </h1>
          </div>
        </div>

        <div className="p-5 sm:p-8 space-y-5 sm:space-y-7">
          {/* Wallet greeting card */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/30 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-800 text-white shadow-xs">
                <Coins className="h-7 w-7" />
              </span>
              <div>
                <span className="text-sm md:text-base font-bold uppercase tracking-wider text-amber-900">
                  Saldo en tu Billetera
                </span>
                <p className="font-serif text-3xl sm:text-4xl font-extrabold text-amber-950 mt-0.5">
                  {currentUser.availablePoints} pts
                </p>
                <p className="text-sm md:text-base md:text-lg text-amber-900/80 mt-1">
                  Canjeables por cualquier libro de la comunidad.
                </p>
              </div>
            </div>

            <button
              onClick={() => setScreen("inicio")}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-800 px-5 py-3 text-base md:text-lg font-bold text-white shadow-xs hover:bg-amber-900 transition-all active:scale-95 shrink-0"
            >
              <span>Explorar Catálogo</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Actions Grid */}
          <div>
            <h2 className="font-serif text-base sm:text-lg font-bold text-stone-900 mb-3 sm:mb-4">
              ¿Qué te gustaría hacer hoy?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                onClick={() => setScreen("publicar")}
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
    <div
      onClick={onClick}
      className={`group flex flex-col justify-between rounded-2xl border p-4 sm:p-5 cursor-pointer transition-all hover:shadow-xs active:scale-[0.99] ${
        highlight
          ? "border-amber-200 bg-amber-50/30 hover:border-amber-300"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              highlight
                ? "bg-amber-800 text-white"
                : "bg-stone-100 text-stone-700 group-hover:bg-amber-100 group-hover:text-amber-900"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-amber-800 transition-colors" />
        </div>
        <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
          {title}
        </h3>
        <p className="mt-1.5 text-sm md:text-base md:text-lg text-stone-600 leading-relaxed">{description}</p>
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100">
        <span className="text-sm md:text-base md:text-lg font-bold text-amber-800 group-hover:underline">
          {cta} →
        </span>
      </div>
    </div>
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
      <p className="text-base md:text-lg text-stone-600 text-balance">{message}</p>
      <button
        type="button"
        onClick={onGo}
        className="rounded-xl bg-amber-800 px-4 py-2.5 text-base md:text-lg font-semibold text-stone-50 hover:bg-amber-900"
      >
        Ir a Iniciar sesión
      </button>
    </div>
  )
}
