"use client"

import { AlertCircle, CheckCircle2 } from "lucide-react"
import { useStore } from "./store"

// Los avisos de error se escriben como negaciones ("No se pudo…", "Saldo insuficiente…"):
// se muestran con otro ícono y color para que no parezcan un éxito.
const ERROR_TOAST = /^(No se pudo|No se puede|No podés|Saldo insuficiente|Solo el dueño|El libro (solicitado )?(ya )?no|Tu libro ofrecido no|La cadena se canceló)/i

export function Toast() {
  const { toast } = useStore()
  if (!toast) return null

  const isError = ERROR_TOAST.test(toast)

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      // En mobile va arriba (debajo del encabezado) para no tapar el contenido ni la barra inferior
      className={`fixed top-[4.5rem] lg:top-auto lg:bottom-6 left-1/2 z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_10px_30px_rgba(28,25,23,0.22)] animate-in fade-in slide-in-from-top-4 lg:slide-in-from-bottom-4 duration-200 ${
        isError ? "border-rose-300/70 bg-rose-700 text-white" : "border-stone-200/80 bg-stone-900 text-stone-50"
      }`}
    >
      {isError ? (
        <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-100" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-amber-400" aria-hidden="true" />
      )}
      <span className="leading-snug">{toast}</span>
    </div>
  )
}
