"use client"

import { useState } from "react"
import { KeyRound, X } from "lucide-react"
import { useStore } from "./store"

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { changePassword } = useStore()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }
    setError("")
    setSaving(true)
    const result = await changePassword(password)
    setSaving(false)
    if (result.success) onClose()
    else setError(result.error || "No se pudo actualizar la contraseña.")
  }

  const inputClass =
    "w-full rounded-xl border border-stone-200 bg-white p-3 text-base text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 p-0 sm:p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3.5 top-3.5 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 id="change-password-title" className="flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
          <KeyRound className="h-5 w-5 text-amber-800" /> Cambiar contraseña
        </h2>
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-bold text-stone-800">
              Nueva contraseña
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm font-bold text-stone-800">
              Confirmar nueva contraseña
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-amber-800 px-4 py-2 text-sm font-bold text-white hover:bg-amber-900 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Actualizar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
