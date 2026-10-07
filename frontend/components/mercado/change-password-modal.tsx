"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useStore } from "./store"
import { Field } from "./field"

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useStore()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }

      showToast("Contraseña actualizada correctamente.")
      onClose()
    } catch {
      setError("No se pudo cambiar la contraseña. Verificá tu conexión e intentá nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 p-0 sm:p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white p-4 sm:p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
          <h2 id="change-password-title" className="font-serif text-lg sm:text-xl font-bold text-stone-900">
            Cambiar contraseña
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Field
            id="new-password"
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Field
            id="confirm-new-password"
            label="Confirmar nueva contraseña"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-stone-200 px-4 py-2 font-semibold text-stone-700">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-amber-800 px-4 py-2 font-bold text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
