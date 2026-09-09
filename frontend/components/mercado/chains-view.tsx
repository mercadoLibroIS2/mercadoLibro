"use client"

import {
  Share2,
  ArrowRight,
  CheckCircle2,
  Clock,
  BookOpen,
  Sparkles,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { useStore } from "./store"

export function ChainsView() {
  const { chains, currentUser, confirmChainStep, rejectChain } = useStore()

  return (
    <div className="space-y-6">
      {/* Intro Box */}
      <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-purple-900 font-bold text-base md:text-lg">
          <Share2 className="h-4.5 w-4.5" />
          <span>Algoritmo de Cadenas Circulares de Intercambio (RF46)</span>
        </div>
        <p className="mt-1.5 text-sm md:text-base md:text-lg text-purple-800 leading-relaxed max-w-3xl">
          Cuando dos personas no pueden intercambiar directamente porque una no tiene lo que la otra busca, MercadoLibro detecta circuitos triangulares de 3 o más participantes donde cada persona entrega un libro y recibe exactamente el libro que desea.
        </p>
      </div>

      {chains.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 p-8 sm:p-12 text-center bg-white">
          <Share2 className="mx-auto h-10 w-10 text-stone-300 mb-3" />
          <p className="text-base sm:text-lg font-serif font-bold text-stone-800">No hay cadenas activas en este momento</p>
          <p className="text-sm md:text-base md:text-lg text-stone-500 mt-1 max-w-md mx-auto">
            A medida que más usuarios agreguen libros a su Tracker y publiquen ejemplares, el algoritmo sugerirá nuevas conexiones.
          </p>
        </div>
      ) : (
        chains.map((chain) => {
          const myStep = chain.steps.find((s) => s.userId === currentUser?.id)
          const allConfirmed = chain.steps.every((s) => s.confirmed)

          return (
            <div
              key={chain.id}
              className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7 shadow-xs overflow-hidden"
            >
              {/* Chain Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-700 text-white font-bold text-base md:text-lg">
                    3P
                  </span>
                  <div>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900">
                      Cadena Triangular de Intercambio #{chain.id.slice(-4)}
                    </h3>
                    <p className="text-sm md:text-base md:text-lg text-stone-500">
                      {chain.steps.length} participantes coordinados en ciclo cerrado
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3.5 py-1 text-sm md:text-base md:text-lg font-bold ${
                    chain.status === "COMPLETADA"
                      ? "bg-emerald-100 text-emerald-800"
                      : chain.status === "CANCELADA"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {chain.status === "COMPLETADA"
                    ? "Cadena Completada"
                    : chain.status === "CANCELADA"
                    ? "Cadena Cancelada"
                    : "En Proceso de Confirmación"}
                </span>
              </div>

              {/* Visual Circular Circuit */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {chain.steps.map((step, idx) => {
                  const isMe = step.userId === currentUser?.id
                  return (
                    <div
                      key={step.userId}
                      className={`relative flex flex-col rounded-2xl border p-4 transition-all ${
                        isMe
                          ? "border-purple-300 bg-purple-50/40 ring-1 ring-purple-300"
                          : "border-stone-200 bg-stone-50/50"
                      }`}
                    >
                      {/* Step Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={step.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover ring-1 ring-stone-200"
                          />
                          <div>
                            <p className="text-base md:text-lg font-bold text-stone-900">
                              {step.userName} {isMe && "(Vos)"}
                            </p>
                            <span className="text-sm md:text-base text-stone-500">
                              Paso {idx + 1} del circuito
                            </span>
                          </div>
                        </div>

                        {step.confirmed ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-sm md:text-base md:text-lg font-bold">
                            <CheckCircle2 className="h-4 w-4" />
                            Aceptó
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 text-sm md:text-base md:text-lg font-medium">
                            <Clock className="h-4 w-4" />
                            Pendiente
                          </span>
                        )}
                      </div>

                      {/* Trade flow */}
                      <div className="mt-4 space-y-2.5 text-sm md:text-base md:text-lg">
                        <div className="rounded-xl bg-white border border-stone-200 p-3">
                          <span className="text-sm md:text-base font-bold text-amber-800 uppercase tracking-wider block">
                            Entrega su libro:
                          </span>
                          <p className="font-semibold text-stone-900 text-base md:text-lg line-clamp-1 mt-0.5">
                            {step.givesBook.title}
                          </p>
                          <p className="text-sm md:text-base text-stone-500">{step.givesBook.author}</p>
                        </div>

                        <div className="flex justify-center text-purple-700">
                          <ArrowRight className="h-4.5 w-4.5 rotate-90 md:rotate-0" />
                        </div>

                        <div className="rounded-xl bg-white border border-stone-200 p-3">
                          <span className="text-sm md:text-base font-bold text-emerald-700 uppercase tracking-wider block">
                            Recibe a cambio:
                          </span>
                          <p className="font-semibold text-stone-900 text-base md:text-lg line-clamp-1 mt-0.5">
                            {step.receivesBook.title}
                          </p>
                          <p className="text-sm md:text-base text-stone-500">{step.receivesBook.author}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* My Actions on the Chain */}
              {chain.status !== "CANCELADA" && chain.status !== "COMPLETADA" && myStep && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
                  <div className="text-sm md:text-base md:text-lg text-stone-600">
                    {myStep.confirmed ? (
                      <p className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <CheckCircle2 className="h-4.5 w-4.5" />
                        Ya confirmaste tu participación. Esperando al resto de los integrantes.
                      </p>
                    ) : (
                      <p>
                        Revisá los libros que entregás y recibís antes de confirmar tu participación en la cadena.
                      </p>
                    )}
                  </div>

                  {!myStep.confirmed && (
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => rejectChain(chain.id)}
                        className="rounded-xl border border-stone-200 px-4 py-2 text-sm md:text-base md:text-lg font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                      >
                        Rechazar
                      </button>

                      <button
                        onClick={() => confirmChainStep(chain.id)}
                        className="flex items-center gap-1.5 rounded-xl bg-purple-700 px-4 py-2 text-sm md:text-base md:text-lg font-bold text-white shadow-xs hover:bg-purple-800 transition-all active:scale-95"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Aceptar mi parte del circuito
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
