"use client"

import { useEffect, useState, type FormEvent } from "react"
import { X } from "lucide-react"
import { useStore } from "./store"
import { Field } from "./field"

export function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { currentUser, updateProfile } = useStore()
  const [name, setName] = useState(currentUser?.name ?? "")
  const [errors, setErrors] = useState<{ name?: string }>({})

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!name.trim()) next.name = "El nombre no puede estar vacío"
    else if (name.trim().length < 3) next.name = "El nombre debe tener al menos 3 caracteres"
    setErrors(next)
    if (Object.keys(next).length > 0) return

    // Solo el nombre se guarda en el backend (PUT /api/usuario/me)
    updateProfile({ name: name.trim() })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl border border-stone-200/90 bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 sm:rounded-3xl sm:p-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pb-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-stone-300" aria-hidden="true" />
        </div>

        <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3.5">
          <h2
            id="edit-profile-title"
            className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-900"
          >
            Editar Perfil
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de edición de perfil"
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            <X className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field
              id="edit-name"
              label="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
            <Field
              id="edit-email"
              label="Email"
              type="email"
              value={currentUser?.email ?? ""}
              readOnly
              disabled
              hint="Es tu identificador para ingresar: no se puede cambiar."
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-stone-200/90 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-900 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
