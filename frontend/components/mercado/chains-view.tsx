"use client"

import { useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Share2,
} from "lucide-react"
import { useStore } from "./store"
import { isUserMatch } from "@/lib/mercado-types"

const STATUS_BADGES = {
  COMPLETADA: {
    label: "Cadena Completada",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  CANCELADA: {
    label: "Cadena Cancelada",
    className: "border-rose-200 bg-rose-50 text-rose-800",
  },
  ACTIVA: {
    label: "En Proceso de Confirmación",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
} as const

export function ChainsView() {
  const { chains, currentUser, confirmChainStep, confirmChainReceipt, rejectChain } = useStore()
  const [pending, setPending] = useState<string | null>(null)
  const act = async (id: string, action: (id: string) => Promise<void>) => {
    if (pending) return
    setPending(id)
    try { await action(id) } finally { setPending(null) }
  }
  const userChains = currentUser
    ? chains.filter((chain) =>
        chain.steps.some((step) => isUserMatch(currentUser, step.userId))
      )
    : []

  return (
    <div className="space-y-6">
      {/* Intro Callout */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.03)] sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>Cadenas circulares de intercambio</span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
          Cuando dos personas no pueden intercambiar directamente porque una no tiene lo que la otra busca, MercadoLibro detecta circuitos de 3 o más participantes donde cada lector entrega un ejemplar y recibe exactamente el título que sigue.
        </p>
      </div>

      {userChains.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300/90 bg-white p-8 text-center sm:p-12">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <Share2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="font-serif text-lg font-bold text-stone-900">
            No hay cadenas activas en este momento
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-500">
            A medida que más lectores agreguen libros a su Tracker y publiquen ejemplares, detectaremos automáticamente nuevos circuitos de intercambio.
          </p>
        </div>
      ) : (
        userChains.map((chain) => {
          const myStep = chain.steps.find((s) =>
            isUserMatch(currentUser, s.userId)
          )
          const allAccepted = chain.steps.every((s) => s.confirmed)
          const inExchange = chain.status === "EN_CURSO" && allAccepted
          const badge =
            chain.status === "COMPLETADA"
              ? STATUS_BADGES.COMPLETADA
              : chain.status === "CANCELADA"
              ? STATUS_BADGES.CANCELADA
              : inExchange ? { ...STATUS_BADGES.ACTIVA, label: "En intercambio · esperando recepción" } : STATUS_BADGES.ACTIVA

          return (
            <div
              key={chain.id}
              className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(28,25,23,0.05)] sm:p-7"
            >
              {/* Chain Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-800 text-xs font-bold tracking-wide text-white">
                    {chain.steps.length}P
                  </span>
                  <div>
                    <h3 className="font-serif text-base sm:text-lg font-bold tracking-tight text-stone-900">
                      Cadena de intercambio #{chain.id.slice(-4)}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500">
                      {chain.steps.length} participantes coordinados en ciclo cerrado
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>

              {/* Circuit Steps */}
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                {chain.steps.map((step, idx) => {
                  const isMe = isUserMatch(currentUser, step.userId)
                  return (
                    <div
                      key={step.userId}
                      className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-colors ${
                        isMe
                          ? "border-amber-300/90 bg-amber-50/45"
                          : "border-stone-200/80 bg-[#faf8f5]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-amber-100 text-xs font-bold text-amber-900">
                            {step.userName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-stone-900">
                              {step.userName} {isMe ? "(Vos)" : ""}
                            </p>
                            <span className="text-xs text-stone-500">
                              Paso {idx + 1} del circuito
                            </span>
                          </div>
                        </div>

                        {step.confirmed ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{step.received ? "Recibió" : inExchange ? "Espera su libro" : "Aceptó"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Pendiente</span>
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-col gap-2.5">
                        <div className="rounded-xl border border-stone-200/80 bg-white p-3">
                          <span className="block text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                            Entrega su libro
                          </span>
                          <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-stone-900">
                            {step.givesBook.title}
                          </p>
                          <p className="truncate text-xs text-stone-500">
                            {step.givesBook.author}
                          </p>
                        </div>

                        <div className="flex justify-center text-stone-400">
                          <ArrowRight
                            className="h-4 w-4 rotate-90 md:rotate-0"
                            aria-hidden="true"
                          />
                        </div>

                        <div className="rounded-xl border border-stone-200/80 bg-white p-3">
                          <span className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                            Recibe a cambio
                          </span>
                          <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-stone-900">
                            {step.receivesBook.title}
                          </p>
                          <p className="truncate text-xs text-stone-500">
                            {step.receivesBook.author}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Action Footer */}
              {chain.status !== "CANCELADA" &&
                chain.status !== "COMPLETADA" &&
                myStep && (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
                    <div className="text-xs sm:text-sm text-stone-600">
                      {inExchange ? (
                        <p>{myStep.received
                          ? "Ya confirmaste la recepción. Esperando las recepciones restantes."
                          : "Todos aceptaron y los libros están reservados. Coordiná la entrega y confirmá cuando recibas tu libro."}
                          {` (${chain.steps.filter((s) => s.received).length}/${chain.steps.length} recepciones)`}
                        </p>
                      ) : myStep.confirmed ? (
                        <p className="flex items-center gap-1.5 font-semibold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>
                            Ya confirmaste tu participación. Esperando al resto de los integrantes.
                          </span>
                        </p>
                      ) : (
                        <p>
                          Revisá los ejemplares que entregás y recibís antes de confirmar tu parte del circuito.
                        </p>
                      )}
                    </div>

                    {inExchange && !myStep.received && (
                      <button type="button" disabled={pending !== null}
                        onClick={() => act(chain.id, confirmChainReceipt)}
                        className="h-10 rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white disabled:opacity-50">
                        Confirmar recepción de mi libro
                      </button>
                    )}
                    {(myStep.confirmed && !chain.steps.some((s) => s.received)) && (
                      <button type="button" disabled={pending !== null} onClick={() => act(chain.id, rejectChain)}
                        className="h-10 rounded-xl border border-stone-200 px-4 text-sm font-semibold disabled:opacity-50">
                        Cancelar participación
                      </button>
                    )}
                    {!myStep.confirmed && (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          disabled={pending !== null}
                          onClick={() => act(chain.id, rejectChain)}
                          className="h-10 rounded-xl border border-stone-200/90 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                        >
                          Rechazar
                        </button>

                        <button
                          type="button"
                          disabled={pending !== null}
                          onClick={() => act(chain.id, confirmChainStep)}
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-900 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          <span>Aceptar mi parte del circuito</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
          )
        })
      )}
    </div>
  )
}
