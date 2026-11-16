"use client"

import { useState } from "react"
import { Flag, X } from "lucide-react"
import { useStore } from "./store"
import { createReport, REASONS_BY_TYPE, REPORT_REASONS, type ReportReason } from "@/lib/admin-db"

const TYPE_TITLES = {
  USUARIO: "Reportar usuario",
  PUBLICACION: "Reportar publicación",
  INTERCAMBIO: "Reportar un problema con el intercambio",
} as const

export function ReportModal() {
  const { reportTarget, setReportTarget, showToast } = useStore()
  const [reason, setReason] = useState<ReportReason | "">("")
  const [detail, setDetail] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  if (!reportTarget) return null
  const target = reportTarget

  function close() {
    setReportTarget(null)
    setReason("")
    setDetail("")
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason) {
      setError("Elegí un motivo.")
      return
    }
    if (detail.trim().length < 10) {
      setError("Contá brevemente qué pasó (al menos 10 caracteres).")
      return
    }
    setSending(true)
    setError("")
    try {
      await createReport(target, reason, detail)
      showToast("Reporte enviado. Un administrador lo va a revisar y te avisamos por notificación.")
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el reporte.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/60 p-0 sm:p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3.5 top-3.5 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center pt-2">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 mb-2.5">
            <Flag className="h-6 w-6" />
          </span>
          <h3 id="report-title" className="font-serif text-xl font-bold text-stone-900">
            {TYPE_TITLES[target.type]}
          </h3>
          <p className="text-sm md:text-base text-stone-600 mt-1">{target.label}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <fieldset>
            <legend className="block text-base font-bold text-stone-800 mb-2">Motivo *</legend>
            <div className="space-y-2">
              {REASONS_BY_TYPE[target.type].map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm md:text-base transition-colors ${
                    reason === value ? "border-rose-300 bg-rose-50 text-rose-900" : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                    className="accent-rose-700"
                  />
                  {REPORT_REASONS[value]}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="report-detail" className="block text-base font-bold text-stone-800 mb-1.5">
              ¿Qué pasó? *
            </label>
            <textarea
              id="report-detail"
              rows={4}
              maxLength={1000}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Describí el problema con el mayor detalle posible: fechas, qué se acordó, qué recibiste..."
              className="w-full rounded-xl border border-stone-200 bg-white p-3 text-base text-stone-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-100"
            />
            <p className="mt-1 text-right text-xs text-stone-400">{detail.length}/1000</p>
          </div>

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

          <div className="flex justify-end gap-2.5 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm md:text-base font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="rounded-xl bg-rose-700 px-4 py-2 text-sm md:text-base font-bold text-white hover:bg-rose-800 disabled:opacity-60"
            >
              {sending ? "Enviando..." : "Enviar reporte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
